/**
 * @jest-environment node
 *
 * Contexte conversationnel Redis (GUIC-259, Lot 0) — fail-soft.
 */
const mockGet = jest.fn()
const mockSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: { get: (...a: unknown[]) => mockGet(...a), set: (...a: unknown[]) => mockSet(...a) },
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { loadContext, saveContext } from '@/lib/ia/context'

beforeEach(() => {
  mockGet.mockReset()
  mockSet.mockReset()
})

test('load : parse l’historique JSON', async () => {
  mockGet.mockResolvedValueOnce(JSON.stringify([{ role: 'user', content: 'salut' }]))
  expect(await loadContext('s1')).toEqual([{ role: 'user', content: 'salut' }])
  expect(mockGet).toHaveBeenCalledWith('yaye:ctx:s1')
})

test('load : clé absente → []', async () => {
  mockGet.mockResolvedValueOnce(null)
  expect(await loadContext('s1')).toEqual([])
})

test('load : FAIL-SOFT (Redis throw) → []', async () => {
  mockGet.mockRejectedValueOnce(new Error('redis down'))
  expect(await loadContext('s1')).toEqual([])
})

test('save : set avec préfixe + TTL', async () => {
  mockSet.mockResolvedValueOnce('OK')
  await saveContext('s1', [{ role: 'user', content: 'hi' }], 1800)
  expect(mockSet).toHaveBeenCalledWith('yaye:ctx:s1', expect.any(String), 'EX', 1800)
})

test('save : FAIL-SOFT (ne throw pas)', async () => {
  mockSet.mockRejectedValueOnce(new Error('redis down'))
  await expect(saveContext('s1', [], 10)).resolves.toBeUndefined()
})
