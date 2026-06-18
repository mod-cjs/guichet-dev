/**
 * @jest-environment node
 *
 * Tests de `runAgent` — boucle function-calling de l'agent Yaye (GUIC-259, Lot 0).
 * Groq et les outils sont mockés → testable sans clé API ni DB.
 */

const mockCreate = jest.fn()
jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: (...a: unknown[]) => mockCreate(...a) } },
  })),
}))

const mockExecute = jest.fn()
jest.mock('@/lib/ia/tools', () => ({
  TOOLS: { test_tool: { execute: (...a: unknown[]) => mockExecute(...a) } },
  TOOL_DEFINITIONS: [
    { type: 'function', function: { name: 'test_tool', description: '', parameters: { type: 'object', properties: {} } } },
  ],
}))

const mockLog = jest.fn()
jest.mock('@/lib/ia/agent-logs', () => ({ logAgentEvent: (...a: unknown[]) => mockLog(...a) }))

import { runAgent } from '@/lib/ia/agent'

const base = { cjsUid: 'u-1', roles: ['beneficiaire'], sessionId: 's-1', canal: 'web' as const }
const final = (content: string) => ({ choices: [{ message: { content, tool_calls: undefined } }] })
const withToolCall = (name: string, args: string) => ({
  choices: [{ message: { content: null, tool_calls: [{ id: 'c1', type: 'function', function: { name, arguments: args } }] } }],
})

beforeEach(() => {
  mockCreate.mockReset()
  mockExecute.mockReset()
  mockLog.mockReset()
})

test('réponse finale directe (aucun outil)', async () => {
  mockCreate.mockResolvedValueOnce(final('Bonjour Awa'))
  const r = await runAgent({ ...base, message: 'Salut' })
  expect(r.reply).toBe('Bonjour Awa')
  expect(r.toolsUsed).toEqual([])
  expect(mockExecute).not.toHaveBeenCalled()
  expect(mockLog).toHaveBeenCalledWith(expect.objectContaining({ typeEvenement: 'reponse_generee' }))
})

test('appelle un outil avec la portée RBAC (cjsUid) puis répond', async () => {
  mockCreate
    .mockResolvedValueOnce(withToolCall('test_tool', '{"scope":"candidatures"}'))
    .mockResolvedValueOnce(final('Tu as 2 candidatures'))
  mockExecute.mockResolvedValueOnce({ ok: true, data: { total: 2 } })

  const r = await runAgent({ ...base, message: 'mes candidatures ?' })

  expect(mockExecute).toHaveBeenCalledWith({ scope: 'candidatures' }, { cjsUid: 'u-1', roles: ['beneficiaire'] })
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
