// Probe de CONFIRMATION (jetable) — hypothèse : le prompt persona pousse le modèle à
// « bavarder » (répondre en prose) au lieu d'appeler l'outil. On compare, à température
// IDENTIQUE (seule la variable prompt change), le taux d'émission d'un tool_call :
//   (A) SYSTEM_PROMPT complet (persona/brièveté/CDP…)   vs   (B) prompt de routage minimal.
// Si (B) appelle et (A) bavarde → hypothèse prouvée.
import { getLlmClient } from '@/lib/ia/llm-client'
import { getSlotModel } from '@/lib/ia/llm-config'
import { SYSTEM_PROMPT } from '@/lib/ia/agent'
import { TOOL_DEFINITIONS } from '@/lib/ia/tools'
import { sanitizeParamsForModel } from '@/lib/ia/supported-models'

const ROUTER_PROMPT =
  "Tu es un ROUTEUR d'outils pour un assistant jeunesse (CJS). Détermine le ou les outils à " +
  "appeler pour traiter la demande, avec leurs arguments. Si la demande porte sur des données de " +
  "l'utilisateur ou du catalogue (offres/opportunités, badge, candidatures, profil, agenda/événements, " +
  "notifications, formations, réservations, bibliothèque, centres), tu DOIS appeler l'outil correspondant. " +
  "N'invente JAMAIS le résultat, ne réponds pas en prose. Si vraiment aucun outil ne s'applique, réponds NONE."

const N = 3

async function probe(model: string, system: string, msg: string): Promise<number> {
  let called = 0
  for (let k = 0; k < N; k++) {
    const completion = await client(model).chat.completions.create({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: msg },
      ],
      tools: TOOL_DEFINITIONS as never,
      tool_choice: 'auto',
      max_tokens: 512,
      ...sanitizeParamsForModel(model, { temperature: 0.4 }), // MÊME temp pour A et B
    })
    if (completion.choices[0]?.message?.tool_calls?.length) called++
  }
  return called
}

let _c: ReturnType<typeof getLlmClient> | null = null
function client(model: string) {
  return (_c ??= getLlmClient(model))
}

async function main() {
  const model = await getSlotModel('agent')
  console.log(`Modèle : ${model} · N=${N} · temp 0.4 (identique A/B)\n`)
  const cases: [string, string][] = [
    ['search_opportunities', "Trouve-moi un emploi dans l'agriculture à Thiès"],
    ['get_badge', 'Montre-moi mon badge CJS'],
    ['get_realtime_data', 'Où en sont mes candidatures ?'],
    ['get_recommendations', 'Tu me recommandes quoi comme offres ?'],
    ['get_notifications', "J'ai des notifications ?"],
    ['query_knowledge_graph', "Qu'est-ce qu'il me manque pour devenir développeur ?"],
    ['get_user_profile (contrôle)', 'Montre-moi mon profil'],
    ['find_centres (contrôle)', 'Où est le centre CJS le plus proche de Pikine ?'],
  ]
  console.log('intent'.padEnd(30), '| A: prompt complet | B: routage minimal')
  console.log('-'.repeat(72))
  let aTot = 0, bTot = 0
  for (const [label, msg] of cases) {
    const a = await probe(model, SYSTEM_PROMPT, msg)
    const b = await probe(model, ROUTER_PROMPT, msg)
    aTot += a; bTot += b
    console.log(label.padEnd(30), `|      ${a}/${N}        |      ${b}/${N}`)
  }
  console.log('-'.repeat(72))
  console.log('TOTAL'.padEnd(30), `|     ${aTot}/${cases.length * N}       |     ${bTot}/${cases.length * N}`)
  console.log(`\nVerdict : ${bTot > aTot ? 'HYPOTHÈSE CONFIRMÉE (le prompt minimal appelle plus)' : 'non confirmée'}`)
  process.exit(0)
}
main().catch((e) => { console.error('ERREUR:', e); process.exit(1) })
