/**
 * @jest-environment node
 *
 * Mémoire LONG TERME de Yaye (résumé persistant par cjsUid) — fail-soft.
 */
const mockGet = jest.fn()
const mockSet = jest.fn()
const mockDel = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...a: unknown[]) => mockGet(...a),
    set: (...a: unknown[]) => mockSet(...a),
    del: (...a: unknown[]) => mockDel(...a),
  },
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

const mockCreate = jest.fn()
jest.mock('@/lib/ia/llm-client', () => ({
  getLlmClient: () => ({ chat: { completions: { create: (...a: unknown[]) => mockCreate(...a) } } }),
  isLlmConfigured: () => Boolean(process.env.GOOGLE_CLOUD_PROJECT),
}))
jest.mock('@/lib/ia/llm-config', () => ({
  getSlotModel: jest.fn().mockResolvedValue('google/gemini-2.5-flash'),
}))

import { loadSummary, saveSummary, purgeSummary, updateSummary, memoKey } from '@/lib/ia/memory'

const ORIG_KEY = process.env.GOOGLE_CLOUD_PROJECT
beforeEach(() => {
  mockGet.mockReset()
  mockSet.mockReset()
  mockDel.mockReset()
  mockCreate.mockReset()
  delete process.env.GOOGLE_CLOUD_PROJECT
})
afterAll(() => {
  if (ORIG_KEY === undefined) delete process.env.GOOGLE_CLOUD_PROJECT
  else process.env.GOOGLE_CLOUD_PROJECT = ORIG_KEY
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

test('purgeSummary : efface la fiche (droit à l’oubli)', async () => {
  mockDel.mockResolvedValueOnce(1)
  await purgeSummary('u-7')
  expect(mockDel).toHaveBeenCalledWith('yaye:memo:u-7')

  mockDel.mockRejectedValueOnce(new Error('redis down'))
  await expect(purgeSummary('u-7')).resolves.toBeUndefined() // fail-soft
})

test('updateSummary : NO-OP si IA non configurée (pas d’appel LLM)', async () => {
  await updateSummary('u-1', 'prior', 'je cherche un stage', 'voici des stages')
  expect(mockCreate).not.toHaveBeenCalled()
  expect(mockSet).not.toHaveBeenCalled()
})

test('updateSummary : configurée → met à jour la fiche via le LLM puis la persiste', async () => {
  process.env.GOOGLE_CLOUD_PROJECT = 'cjs-prod'
  mockCreate.mockResolvedValueOnce({ choices: [{ message: { content: '- vise un stage en agro à Thiès' } }] })
  mockSet.mockResolvedValueOnce('OK')

  await updateSummary('u-7', '(vide)', 'un stage agro à Thiès', 'voici 2 stages')

  expect(mockCreate).toHaveBeenCalled()
  expect(mockSet).toHaveBeenCalledWith('yaye:memo:u-7', '- vise un stage en agro à Thiès', 'EX', 90 * 24 * 3600)
})

test('updateSummary : FAIL-SOFT (LLM throw → ne lève pas, pas de save)', async () => {
  process.env.GOOGLE_CLOUD_PROJECT = 'cjs-prod'
  mockCreate.mockRejectedValueOnce(new Error('vertex down'))
  await expect(updateSummary('u-1', 'p', 'q', 'a')).resolves.toBeUndefined()
  expect(mockSet).not.toHaveBeenCalled()
})
