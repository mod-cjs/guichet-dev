// Runner d'évaluation LOCALE de Yaye (jalon E+). Rejoue la suite `eval-suite.ts` contre
// le vrai agent (via LMStudio en dev) + les données réelles, applique les checks
// déterministes (routing, no-tool, persona, dédup cards, diversité) et écrit un rapport
// JSON consommé par un artefact de visualisation.
//
// Usage (dans un conteneur/env avec LLM_PROVIDER=lmstudio + DB/Redis) :
//   npx tsx scripts/yaye-eval-local.ts [chemin-rapport.json]

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname } from 'node:path'
import { runAgent } from '@/lib/ia/agent'
import { activeProvider } from '@/lib/ia/llm-client'
import { getSlotModel } from '@/lib/ia/llm-config'
import { EVAL_SCENARIOS, EVAL_SUITE_VERSION, HARD_FAIL_CATEGORIES, type EvalScenario } from '@/lib/ia/metrics/golden/eval-suite'
import {
  firstTool,
  personaCheck,
  checkDuplicateCards,
  diversityReport,
  checkArgs,
  usesForbiddenTool,
  detectRefusal,
  containsUngroundedSpecifics,
  checkCardQuality,
  type ToolCallLite,
} from '@/lib/ia/metrics/golden/checks'
import type { YayeBlock } from '@/lib/ia/blocks'

type Turn = { role: 'user' | 'assistant'; content: string }

interface AgentOut {
  reply: string
  blocks: YayeBlock[]
  toolsUsed: string[]
  toolCalls: ToolCallLite[]
}

function offerTitles(blocks: YayeBlock[]): string[] {
  const out: string[] = []
  for (const b of blocks) if (b.kind === 'opportunites') for (const it of b.items) out.push(it.titre)
  return out
}
function hasEscalade(out: AgentOut): boolean {
  return out.blocks.some((b) => b.kind === 'escalade') || out.toolsUsed.includes('escalate_to_advisor')
}

/** Joue tous les tours d'un scénario (historique threadé) et renvoie le résultat du DERNIER tour. */
async function playScenario(sc: EvalScenario, cjsUid: string): Promise<AgentOut> {
  const history: Turn[] = []
  let last: AgentOut = { reply: '', blocks: [], toolsUsed: [], toolCalls: [] }
  for (let i = 0; i < sc.turns.length; i++) {
    const r = await runAgent({
      message: sc.turns[i],
      history,
      cjsUid,
      roles: ['beneficiaire'],
      sessionId: `eval-${sc.id}`,
      canal: 'web',
    })
    last = { reply: r.reply, blocks: r.blocks, toolsUsed: r.toolsUsed, toolCalls: r.toolCalls }
    history.push({ role: 'user', content: sc.turns[i] })
    history.push({ role: 'assistant', content: r.reply })
  }
  return last
}

function evaluate(sc: EvalScenario, out: AgentOut) {
  const tool = firstTool(out.toolsUsed)
  const nonEscaladeTools = out.toolsUsed.filter((t) => t !== 'escalate_to_advisor')
  const checks: { name: string; pass: boolean; hard?: boolean; detail?: string }[] = []

  if (sc.mustNotUseTool) {
    checks.push({ name: 'no-tool', pass: out.toolsUsed.length === 0, detail: `outils=${out.toolsUsed.join(',') || '∅'}` })
  }
  if (sc.expectedTool !== undefined) {
    checks.push({ name: 'routing', pass: tool === sc.expectedTool, detail: `attendu=${sc.expectedTool} obtenu=${tool}` })
  }
  if (sc.allowedTools) {
    checks.push({ name: 'routing-allowed', pass: tool !== null && sc.allowedTools.includes(tool), detail: `∈{${sc.allowedTools.join(',')}} obtenu=${tool}` })
  }
  if (sc.forbiddenTools) {
    const bad = usesForbiddenTool(sc.forbiddenTools, out.toolsUsed)
    checks.push({ name: 'no-forbidden-tool', pass: bad.length === 0, hard: true, detail: bad.length ? `INTERDIT appelé: ${bad.join(',')}` : 'ok' })
  }
  if (sc.expectedArgs) {
    const a = checkArgs(sc.expectedArgs, out.toolCalls, sc.argsTool ?? sc.expectedTool ?? undefined)
    checks.push({ name: 'args', pass: a.pass, detail: a.detail })
  }
  if (sc.expectEscalation) {
    const escalated = hasEscalade(out) || out.toolsUsed.includes('escalate_to_advisor')
    checks.push({ name: 'escalation', pass: escalated, hard: true, detail: escalated ? 'escalade émise' : 'PAS d’escalade' })
  }
  if (sc.mustNotEscalate) {
    const escalated = hasEscalade(out) || out.toolsUsed.includes('escalate_to_advisor')
    checks.push({ name: 'no-over-escalation', pass: !escalated, hard: true, detail: escalated ? 'escalade à tort (simple déception)' : 'pas d’escalade — ok' })
  }
  if (sc.mustRefuse) {
    const refused = detectRefusal(out.reply) && nonEscaladeTools.length === 0
    checks.push({ name: 'refusal', pass: refused, hard: true, detail: refused ? 'refus correct' : `pas de refus (outils=${out.toolsUsed.join(',') || '∅'})` })
  }
  if (sc.mustNotRefuse) {
    checks.push({ name: 'no-over-refusal', pass: !detectRefusal(out.reply), detail: detectRefusal(out.reply) ? 'refuse à tort' : 'aide' })
  }
  if (sc.grounded) {
    const g = containsUngroundedSpecifics(out.reply)
    checks.push({ name: 'grounded', pass: !g.flagged, hard: true, detail: g.flagged ? `INVENTÉ: ${g.hits.join(', ')}` : 'ancré' })
  }

  const persona = personaCheck(out.reply, {
    offerTitles: offerTitles(out.blocks),
    maxSentences: sc.persona?.maxSentences,
    expectTutoiement: sc.persona?.expectTutoiement,
  })
  const cards = checkDuplicateCards(out.blocks)
  checks.push({ name: 'no-duplicate-cards', pass: !cards.duplicated, detail: cards.duplicated ? `doublons=${cards.duplicateIds.join(',')}` : `${cards.uniqueOppItems} cards uniques` })

  // Rendu visuel : cards bien formées (sinon card cassée à l'écran).
  const rendu = checkCardQuality(out.blocks)
  if (rendu.oppCount > 0 || rendu.malformed.length > 0) {
    checks.push({ name: 'card-rendering', pass: rendu.ok, detail: rendu.ok ? `${rendu.oppCount} cards OK [${rendu.kinds.join('+')}]` : `cards cassées: ${rendu.malformed.join(', ')}` })
  }

  const pass = checks.every((c) => c.pass)
  const hardFail = checks.some((c) => c.hard && !c.pass) || (HARD_FAIL_CATEGORIES.includes(sc.category) && !pass)
  return { tool, checks, persona, cards, rendu, pass, hardFail }
}

async function main() {
  const outPath = process.argv[2] || '/app/scratch-eval/report.json'
  const model = await getSlotModel('agent')
  const startedAt = process.env.EVAL_STAMP || 'local'
  console.log(`Éval Yaye — provider=${activeProvider()} modèle=${model} suite=${EVAL_SUITE_VERSION}`)

  const results: unknown[] = []
  for (const sc of EVAL_SCENARIOS) {
    try {
      if (sc.repeat && sc.repeat > 1) {
        // Diversité / anti-répétition : rejouer N fois en contexte FRAIS.
        const replies: string[] = []
        const perRun: unknown[] = []
        for (let k = 0; k < sc.repeat; k++) {
          const out = await playScenario(sc, `eval-${sc.id}-${k}`)
          replies.push(out.reply)
          const ev = evaluate(sc, out)
          perRun.push({ reply: out.reply, tool: ev.tool, persona: ev.persona, pass: ev.pass })
        }
        const diversity = diversityReport(replies)
        const pass = perRun.every((r) => (r as { pass: boolean }).pass) && diversity.exactDuplicates === 0 && diversity.nearDuplicatePairs.length === 0
        results.push({ id: sc.id, category: sc.category, note: sc.note, turns: sc.turns, repeat: sc.repeat, diversity, runs: perRun, pass })
        console.log(`  ${pass ? '✓' : '✗'} ${sc.id} [${sc.category}] diversité=${diversity.score} dup=${diversity.exactDuplicates}/${diversity.nearDuplicatePairs.length}`)
      } else {
        const out = await playScenario(sc, `eval-${sc.id}`)
        const ev = evaluate(sc, out)
        results.push({ id: sc.id, category: sc.category, difficulty: sc.difficulty, note: sc.note, turns: sc.turns, reply: out.reply, toolsUsed: out.toolsUsed, toolCalls: out.toolCalls, blocks: out.blocks, ...ev })
        const mark = ev.pass ? '✓' : ev.hardFail ? '⛔' : '✗'
        console.log(`  ${mark} ${sc.id} [${sc.category}] tool=${ev.tool} persona=${ev.persona.score.toFixed(2)}${ev.persona.flags.length ? ' ⚠ ' + ev.persona.flags.join('; ') : ''}`)
      }
    } catch (e) {
      results.push({ id: sc.id, category: sc.category, error: String(e), pass: false })
      console.log(`  ✗ ${sc.id} ERREUR ${String(e).slice(0, 120)}`)
    }
  }

  // Agrégations par catégorie.
  const byCat: Record<string, { total: number; pass: number }> = {}
  for (const r of results as { category: string; pass: boolean }[]) {
    byCat[r.category] ??= { total: 0, pass: 0 }
    byCat[r.category].total++
    if (r.pass) byCat[r.category].pass++
  }
  const total = results.length
  const passed = (results as { pass: boolean }[]).filter((r) => r.pass).length
  const hardFails = (results as { hardFail?: boolean }[]).filter((r) => r.hardFail).length

  const report = {
    version: EVAL_SUITE_VERSION,
    provider: activeProvider(),
    model,
    startedAt,
    summary: { total, passed, hardFails, rate: total ? Number((passed / total).toFixed(3)) : 0, byCategory: byCat },
    results,
  }
  mkdirSync(dirname(outPath), { recursive: true })
  writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf-8')
  console.log(`\n=== ${passed}/${total} scénarios OK (${report.summary.rate}) — rapport: ${outPath} ===`)
  process.exit(0)
}

main().catch((e) => {
  console.error('ERREUR runner:', e)
  process.exit(1)
})
