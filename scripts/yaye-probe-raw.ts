// Probe DIAGNOSTIC (jetable) : sortie BRUTE du modèle avant tout garde-fou.
// Tranche Mode A : tool_calls émis (routage OK) vs contenu en prose (narration).
import { getLlmClient } from '@/lib/ia/llm-client'
import { getSlotModel } from '@/lib/ia/llm-config'
import { SYSTEM_PROMPT } from '@/lib/ia/agent'
import { TOOL_DEFINITIONS } from '@/lib/ia/tools'
import { sanitizeParamsForModel } from '@/lib/ia/supported-models'

async function probe(model: string, msg: string) {
  const client = getLlmClient(model)
  const completion = await client.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: msg },
    ],
    tools: TOOL_DEFINITIONS as never,
    tool_choice: 'auto',
    max_tokens: 1024,
    ...sanitizeParamsForModel(model, { temperature: 0.4 }),
  })
  const c = completion.choices[0]
  const m = c?.message
  console.log(`\n### « ${msg} »`)
  console.log(`  finish_reason : ${c?.finish_reason}`)
  console.log(`  tool_calls    : ${m?.tool_calls ? JSON.stringify(m.tool_calls.map((t) => ({ name: t.function?.name, args: t.function?.arguments }))) : 'AUCUN'}`)
  console.log(`  content       : ${JSON.stringify(m?.content ?? null)?.slice(0, 400)}`)
}

async function main() {
  const model = await getSlotModel('agent')
  console.log('Modèle :', model)
  for (const msg of [
    "Trouve-moi un emploi dans l'agriculture à Thiès", // r-search — Mode A
    'Montre-moi mon badge CJS', // r-badge — Mode A
    'Où se trouve le centre CJS le plus proche de Pikine ?', // r-centres — fonctionne
  ]) {
    await probe(model, msg)
  }
}
main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
