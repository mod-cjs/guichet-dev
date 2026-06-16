export const meta = {
  name: 'wave-integration',
  description: 'Orchestre une vague entière d\'intégration design v3 : parse la spec, setup worktrees, fan-out implémenteurs en parallèle (≤3-4), gates qualité par delivery via design-v3-component, post-audit Playwright 3 viewports.',
  whenToUse: 'Use this when the user invokes /wave <name> after a wave spec has been written in .agent_context/specs/wave-<name>.md. Invoked by the /wave skill, never directly.',
  phases: [
    { title: 'Pré-flight', detail: 'Validation spec + Wave 0 + feature flag + périmètres disjoints' },
    { title: 'Setup', detail: 'Création worktrees + tickets Jira par implementer' },
    { title: 'Pipeline tickets', detail: 'design-v3-component en pipeline pour chaque ticket (max 3-4 concurrent)' },
    { title: 'Post-audit Playwright', detail: 'ui-ux-tester screenshots 3 viewports + diff design v3' },
    { title: 'Synthèse vague', detail: 'Rapport agrégé : tickets livrés, PRs ouvertes, anomalies' },
  ],
}

// ============================================================
// args:
//   - waveName (string) — matches .agent_context/specs/wave-<name>.md
//   - dryRun (bool, default false)
//   - maxParallel (int, default 3, hard cap 4)
//   - skipPlaywright (bool, default false) — skip post-audit screenshots
// ============================================================

const {
  waveName,
  dryRun = false,
  maxParallel = 3,
  skipPlaywright = false,
} = args || {}

if (!waveName) throw new Error('waveName required')
const capped = Math.min(maxParallel, 4)
if (capped !== maxParallel) log(`maxParallel ${maxParallel} → capped to 4`)

const specPath = `.agent_context/specs/wave-${waveName}.md`

log(`▶ wave-integration : ${waveName} (dryRun=${dryRun}, maxParallel=${capped})`)

// ============================================================
// Phase 1 — Pré-flight (validation)
// ============================================================
phase('Pré-flight')

const preflight = await agent(
  `Pré-flight pour la vague \`${waveName}\` :
1. Lis \`${specPath}\` — s'il n'existe pas, retourne { ok: false, reason: 'spec absente, voir wave-template.md' }
2. Extrait depuis la spec : la liste des tickets (table § Tickets), les périmètres par ticket (§ Périmètres disjoints), les dépendances DAG (§ Dépendances), les Lot refs.
3. Vérifie :
   - Toutes les sections obligatoires présentes (Objectif, Tickets, Périmètres disjoints, Dépendances, Lot v3, Feature flag, Critères, Hors périmètre, Risques, Validation humaine)
   - Aucun chevauchement de périmètre entre tickets (vérifier fichier par fichier)
   - Vague 0 (purge-debt) faite : grep dans git log origin/dev --oneline -50 le pattern "GUIC.*purge|purge.*GUIC"
   - NEXT_PUBLIC_DESIGN_V3 déclaré dans .env.local.example
   - Checklist § Validation humaine entièrement cochée
4. Retourne un JSON STRICT : { ok: bool, reason?: string, tickets?: [{ ticket, component, lot, agentType, depends_on: [...] }], blockers?: [...] }`,
  {
    subagent_type: 'agent-organizer',
    label: 'preflight',
    phase: 'Pré-flight',
    schema: {
      type: 'object',
      required: ['ok'],
      properties: {
        ok: { type: 'boolean' },
        reason: { type: 'string' },
        tickets: {
          type: 'array',
          items: {
            type: 'object',
            required: ['ticket', 'component', 'lot', 'agentType'],
            properties: {
              ticket: { type: 'string', pattern: '^GUIC-\\d+$' },
              component: { type: 'string' },
              lot: { type: 'string', pattern: '^Lot ([1-9]|1[0-4])$' },
              agentType: { type: 'string' },
              depends_on: { type: 'array', items: { type: 'string' } },
            },
          },
        },
        blockers: { type: 'array', items: { type: 'string' } },
      },
    },
  },
)

if (!preflight || !preflight.ok) {
  return {
    ok: false,
    stage: 'preflight',
    waveName,
    reason: preflight?.reason || 'preflight returned null',
    blockers: preflight?.blockers || [],
  }
}

log(`  ${preflight.tickets.length} tickets à traiter`)

if (dryRun) {
  return {
    ok: true,
    dryRun: true,
    waveName,
    plan: preflight.tickets,
    note: 'dry-run — no agents spawned, no worktrees created',
  }
}

// ============================================================
// Phase 2 — Setup worktrees
// ============================================================
phase('Setup')
log('Creating worktrees per ticket')

const setupResults = await parallel(
  preflight.tickets.map((t) => () =>
    agent(
      `Setup worktree pour ${t.ticket} :
- branche : feat/${t.ticket}-${t.component.split('/').pop().replace(/\\..*/, '').toLowerCase()}
- path : .claude/worktrees/${t.ticket.toLowerCase()}
- base : origin/dev

Crée le worktree (git worktree add -B ...) depuis origin/dev frais.
Update Jira : transition vers "En cours" (id 21).
Retourne JSON { ticket, branch, worktreePath } ou { ticket, error }.`,
      {
        subagent_type: 'git-workflow-manager',
        label: `setup:${t.ticket}`,
        phase: 'Setup',
        schema: {
          type: 'object',
          required: ['ticket'],
          properties: {
            ticket: { type: 'string' },
            branch: { type: 'string' },
            worktreePath: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    ),
  ),
)

const validSetups = setupResults.filter(Boolean).filter((r) => !r.error)
if (validSetups.length === 0) {
  return { ok: false, stage: 'setup', waveName, setupResults }
}
if (validSetups.length < preflight.tickets.length) {
  log(`  WARN : ${preflight.tickets.length - validSetups.length} setup(s) failed, continuing with ${validSetups.length}`)
}

// ============================================================
// Phase 3 — Pipeline tickets (design-v3-component per ticket)
// ============================================================
phase('Pipeline tickets')
log(`Spawning design-v3-component for ${validSetups.length} tickets (max ${capped} concurrent)`)

const ticketMap = Object.fromEntries(preflight.tickets.map((t) => [t.ticket, t]))

// Use pipeline for each ticket — automatic concurrency control via parallel/pipeline
const results = await parallel(
  validSetups.map((s) => async () => {
    const t = ticketMap[s.ticket]
    const userStoryTitle = `${t.component.split('/').pop()} conforme ${t.lot}`
    return await workflow('design-v3-component', {
      ticket: t.ticket,
      component: t.component,
      lot: t.lot,
      worktreePath: s.worktreePath,
      branch: s.branch,
      userStoryTitle,
      agentType: t.agentType,
      maxRetries: 2,
    })
  }),
)

const livrés = results.filter(Boolean).filter((r) => r.ok)
const échecs = results.filter(Boolean).filter((r) => !r.ok)

log(`  ${livrés.length}/${validSetups.length} tickets livrés, ${échecs.length} échecs`)

// ============================================================
// Phase 4 — Post-audit Playwright (optionnel)
// ============================================================
let postAudit = null
if (!skipPlaywright && livrés.length > 0) {
  phase('Post-audit Playwright')
  log('Capturing 3-viewport screenshots via ui-ux-tester + Playwright MCP')
  postAudit = await agent(
    `Vague ${waveName} terminée. Pour chacun des composants livrés ci-dessous, capture 3 screenshots Playwright (mobile 375x812, tablet 768x1024, desktop 1440x900) et compare visuellement au Lot v3 référence. Retourne un rapport synthétique des écarts visuels résiduels.

Composants livrés :
${livrés.map((r) => `- ${r.ticket} : ${r.component} (${r.lot})`).join('\\n')}

Si le dev server (http://localhost:3000) n'est pas accessible, indique-le et skip les screenshots.`,
    {
      subagent_type: 'ui-ux-tester',
      label: 'post-audit',
      phase: 'Post-audit Playwright',
    },
  )
}

// ============================================================
// Phase 5 — Synthèse vague
// ============================================================
phase('Synthèse vague')

return {
  ok: échecs.length === 0,
  waveName,
  totalTickets: preflight.tickets.length,
  livrés: livrés.map((r) => ({ ticket: r.ticket, component: r.component, lot: r.lot })),
  échecs: échecs.map((r) => ({ ticket: r.ticket, stage: r.stage, message: r.message })),
  postAudit: postAudit ? String(postAudit).slice(0, 1000) : null,
}
