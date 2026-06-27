/**
 * @jest-environment node
 *
 * Mémoire LONG TERME de Yaye (résumé persistant par cjsUid) — fail-soft.
 */
const mockGet = jest.fn()
const mockSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: { get: (...a: unknown[]) => mockGet(...a), set: (...a: unknown[]) => mockSet(...a) },
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

const mockCreate = jest.fn()
jest.mock('groq-sdk', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: (...a: unknown[]) => mockCreate(...a) } },
  })),
}))

import { loadSummary, saveSummary, updateSummary, memoKey } from '@/lib/ia/memory'

const ORIG_KEY = process.env.GROQ_API_KEY
beforeEach(() => {
  mockGet.mockReset()
  mockSet.mockReset()
  mockCreate.mockReset()
  delete process.env.GROQ_API_KEY
})
afterAll(() => {
  if (ORIG_KEY === undefined) delete process.env.GROQ_API_KEY
  else process.env.GROQ_API_KEY = ORIG_KEY
})

test('memoKey : préfixe par utilisateur', () => {
  expect(memoKey('u-1')).toBe('yaye:memo:u-1')
})

test('loadSummary : lit la fiche ("" si absente ou erreur)', async () => {
  mockGet.mockResolvedValueOnce('- vise un stage en agro')
  expect(await loadSummary('u-1')).toBe('- vise un stage en agro')
  expect(mockGet).toHaveBeenCalledWith('yaye:memo:u-1')

  mockGet.mockResolvedValueOnce(null)
  expect(await loadSummary('u-1')).toBe('')

  mockGet.mockRejectedValueOnce(new Error('redis down'))
  expect(await loadSummary('u-1')).toBe('') // fail-soft
})

test('saveSummary : set préfixé + TTL long', async () => {
  mockSet.mockResolvedValueOnce('OK')
  await saveSummary('u-1', '- vise un stage')
  expect(mockSet).toHaveBeenCalledWith('yaye:memo:u-1', '- vise un stage', 'EX', 90 * 24 * 3600)
})

test('updateSummary : NO-OP sans clé Groq (pas d’appel LLM)', async () => {
  await updateSummary('u-1', 'prior', 'je cherche un stage', 'voici des stages')
  expect(mockCreate).not.toHaveBeenCalled()
  expect(mockSet).not.toHaveBeenCalled()
})

test('updateSummary : avec clé → met à jour la fiche via le LLM puis la persiste', async () => {
  process.env.GROQ_API_KEY = 'test-key'
  mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: '- vise un stage en agro à Thiès' } }] })
  mockSet.mockResolvedValueOnce('OK')

  await updateSummary('u-7', '(vide)', 'un stage agro à Thiès', 'voici 2 stages')

  expect(mockCreate).toHaveBeenCalled()
  expect(mockSet).toHaveBeenCalledWith('yaye:memo:u-7', '- vise un stage en agro à Thiès', 'EX', 90 * 24 * 3600)
})

test('updateSummary : FAIL-SOFT (LLM throw → ne lève pas, pas de save)', async () => {
  process.env.GROQ_API_KEY = 'test-key'
  mockCreate.mockRejectedValueOnce(new Error('groq down'))
  await expect(updateSummary('u-1', 'p', 'q', 'a')).resolves.toBeUndefined()
  expect(mockSet).not.toHaveBeenCalled()
})
