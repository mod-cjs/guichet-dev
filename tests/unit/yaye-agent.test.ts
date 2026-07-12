/**
 * @jest-environment node
 *
 * Tests de `runAgent` — boucle function-calling de l'agent Yaye (GUIC-259, Lot 0).
 * Le client LLM (Vertex) et les outils sont mockés → testable sans GCP ni DB.
 */

const mockCreate = jest.fn()
jest.mock('@/lib/ia/llm-client', () => ({
  getLlmClient: () => ({ chat: { completions: { create: (...a: unknown[]) => mockCreate(...a) } } }),
  isLlmConfigured: () => true,
}))
jest.mock('@/lib/ia/llm-config', () => ({
  getSlotModel: jest.fn().mockResolvedValue('google/gemini-2.5-flash'),
}))
// La contextualisation graphe est testée séparément ; ici on l'isole (pas de DB/graphe).
jest.mock('@/lib/ia/graph-context', () => ({ buildGraphContext: async () => '', GRAPH_PREAMBLE: '' }))

const mockExecute = jest.fn()
jest.mock('@/lib/ia/tools', () => ({
  TOOLS: { test_tool: { execute: (...a: unknown[]) => mockExecute(...a) } },
  TOOL_DEFINITIONS: [
    { type: 'function', function: { name: 'test_tool', description: '', parameters: { type: 'object', properties: {} } } },
  ],
}))

const mockLog = jest.fn()
jest.mock('@/lib/ia/agent-logs', () => ({ logAgentEvent: (...a: unknown[]) => mockLog(...a) }))

import { runAgent, streamAgent, SYSTEM_PROMPT, type AgentStreamEvent } from '@/lib/ia/agent'

const base = { cjsUid: 'u-1', roles: ['beneficiaire'], sessionId: 's-1', canal: 'web' as const }
const final = (content: string) => ({ choices: [{ message: { content, tool_calls: undefined } }] })
const withToolCall = (name: string, args: string) => ({
  choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name, arguments: args } }] } }],
})

// ── Helpers streaming (Groq stream:true → flux async de chunks delta) ──────────
async function* streamOf<T>(chunks: T[]): AsyncGenerator<T> {
  for (const c of chunks) yield c
}
const textDelta = (content: string) => ({ choices: [{ delta: { content } }] })
const toolDelta = (name: string, args: string) => ({
  choices: [{ delta: { tool_calls: [{ index: 0, id: 'c1', function: { name, arguments: args } }] } }],
})
async function collect(gen: AsyncGenerator<AgentStreamEvent>): Promise<AgentStreamEvent[]> {
  const out: AgentStreamEvent[] = []
  for await (const e of gen) out.push(e)
  return out
}

beforeEach(() => {
  mockCreate.mockReset()
  mockExecute.mockReset()
  mockLog.mockReset()
})

test('réponse finale directe (aucun outil)', async () => {
  mockCreate.mockResolvedValueOnce(final('Bonjour Awa'))
  const r = await runAgent({ ...base, message: 'Explique-moi le programme YEAH' })
  expect(r.reply).toBe('Bonjour Awa')
  expect(r.toolsUsed).toEqual([])
  expect(mockExecute).not.toHaveBeenCalled()
  expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ typeEvenement: 'reponse_generee' }))
})

test('prompt : la présentation de soi est une réponse directe SANS outil', () => {
  // Garde-fou (bug terrain) : « présente-toi » ne doit pas relancer une recherche d'offres.
  expect(SYSTEM_PROMPT).toMatch(/présente-toi/i)
  expect(SYSTEM_PROMPT).toMatch(/SANS AUCUN outil/i)
  expect(SYSTEM_PROMPT).toMatch(/ne ressors jamais d'offres pour te présenter/i)
})

test('prompt : règles comportementales « sonner juste » (anti-robot)', () => {
  expect(SYSTEM_PROMPT).toMatch(/Clarifie avant d'agir/i) // grounding
  expect(SYSTEM_PROMPT).toMatch(/Montre que tu écoutes/i) // écoute active
  expect(SYSTEM_PROMPT).toMatch(/Accompagne l'émotion/i) // gradient émotionnel
  expect(SYSTEM_PROMPT).toMatch(/Dose ta certitude/i) // incertitude calibrée
  expect(SYSTEM_PROMPT).toMatch(/Adapte-toi à la personne/i) // registre
  expect(SYSTEM_PROMPT).toMatch(/Reste toi-même si ça coince/i) // persona sur erreur
})

test('prompt : repère les situations de danger (sécurité)', () => {
  expect(SYSTEM_PROMPT).toMatch(/situations de danger/i)
  expect(SYSTEM_PROMPT).toMatch(/harc[eè]lement/i)
  expect(SYSTEM_PROMPT).toMatch(/signal_danger/i)
  expect(SYSTEM_PROMPT).toMatch(/signale quand même/i) // biais de prudence
})

test('injecte la mémoire long terme (memo) dans le contexte système', async () => {
  mockCreate.mockResolvedValueOnce(final('Bonjour'))
  await runAgent({ ...base, message: 'Explique-moi le programme YEAH', memo: '- vise un stage en agro à Thiès' })
  const sent = mockCreate.mock.calls[0][0].messages as { role: string; content: string }[]
  const systemContent = sent.filter(m => m.role === 'system').map(m => m.content).join('\n')
  expect(systemContent).toContain('vise un stage en agro à Thiès')
})

test('sans memo : aucun message système supplémentaire', async () => {
  mockCreate.mockResolvedValueOnce(final('Bonjour'))
  await runAgent({ ...base, message: 'Explique-moi le programme YEAH' })
  const sent = mockCreate.mock.calls[0][0].messages as { role: string; content: string }[]
  expect(sent.filter(m => m.role === 'system')).toHaveLength(1)
})

test('appelle un outil avec la portée RBAC (cjsUid) puis répond', async () => {
  mockCreate
    .mockResolvedValueOnce(withToolCall('test_tool', '{"scope":"candidatures"}'))
    .mockResolvedValueOnce(final('Tu as 2 candidatures'))
  mockExecute.mockResolvedValueOnce({ ok: true, data: { total: 2 } })

  const r = await runAgent({ ...base, message: 'mes candidatures ?' })

  expect(mockExecute).toHaveBeenCalledWith(
    { scope: 'candidatures' },
    { cjsUid: 'u-1', roles: ['beneficiaire'], centreId: null, sessionId: 's-1', canal: 'web' },
  )
  expect(r.toolsUsed).toEqual(['test_tool'])
  expect(r.reply).toBe('Tu as 2 candidatures')
  expect(mockLog).toHaveBeenCalledWith(
    expect.objectContaining({ typeEvenement: 'api_appelee', toolCalled: 'test_tool', statut: 'succes' }),
  )
})

test('surface le bloc d’un outil (cards) dans result.blocks, texte en tête', async () => {
  mockCreate
    .mockResolvedValueOnce(withToolCall('test_tool', '{}'))
    .mockResolvedValueOnce(final('Voici 1 offre pour toi'))
  mockExecute.mockResolvedValueOnce({
    ok: true,
    data: { count: 1 },
    block: {
      kind: 'opportunites',
      items: [{ id: 'o1', slug: 's', titre: 't', type: 'Emploi', organisation: null, region: null, deadline: null }],
    },
  })

  const r = await runAgent({ ...base, message: 'des offres ?' })

  expect(r.blocks[0].kind).toBe('text') // bloc texte en premier
  expect(r.blocks.some(b => b.kind === 'opportunites')).toBe(true)
})

test('outil inconnu : géré sans crash, on continue', async () => {
  mockCreate
    .mockResolvedValueOnce(withToolCall('outil_inexistant', '{}'))
    .mockResolvedValueOnce(final('OK'))
  const r = await runAgent({ ...base, message: 'x' })
  expect(r.reply).toBe('OK')
  expect(mockExecute).not.toHaveBeenCalled()
})

test('garde-fou : trop de tours d’outils → réponse d’escalade + log erreur', async () => {
  mockCreate.mockResolvedValue(withToolCall('test_tool', '{}')) // jamais de réponse finale
  mockExecute.mockResolvedValue({ ok: true, data: {} })
  const r = await runAgent({ ...base, message: 'boucle' })
  expect(r.reply).toMatch(/conseiller/i)
  expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ typeEvenement: 'erreur', statut: 'partiel' }))
})

// ── streamAgent (SSE, #1) ─────────────────────────────────────────────────────

test('streamAgent : émet les tokens de la réponse puis un done cohérent (sans outil)', async () => {
  mockCreate.mockResolvedValueOnce(streamOf([textDelta('Bon'), textDelta('jour'), textDelta(' Awa')]))
  const evs = await collect(streamAgent({ ...base, message: 'Explique-moi le programme YEAH' }))

  const tokens = evs.filter(e => e.type === 'token').map(e => e.type === 'token' && e.text).join('')
  expect(tokens).toBe('Bonjour Awa')
  const done = evs.find(e => e.type === 'done')
  expect(done).toBeDefined()
  if (done?.type === 'done') {
    expect(done.reply).toBe('Bonjour Awa')
    expect(done.blocks[0]).toEqual({ kind: 'text', text: 'Bonjour Awa' })
    expect(mockExecute).not.toHaveBeenCalled()
  }
})

test('streamAgent : émet un événement tool (progression) puis la réponse finale', async () => {
  mockCreate
    .mockResolvedValueOnce(streamOf([toolDelta('test_tool', '{}')]))
    .mockResolvedValueOnce(streamOf([textDelta('Voici')]))
  mockExecute.mockResolvedValueOnce({ ok: true, data: {} })

  const evs = await collect(streamAgent({ ...base, message: 'des offres' }))

  expect(evs.some(e => e.type === 'tool' && e.name === 'test_tool')).toBe(true)
  expect(mockExecute).toHaveBeenCalled()
  const done = evs.find(e => e.type === 'done')
  expect(done?.type === 'done' && done.reply).toBe('Voici')
})
