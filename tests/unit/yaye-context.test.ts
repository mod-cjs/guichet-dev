/**
 * @jest-environment node
 *
 * Contexte conversationnel Redis (GUIC-259, Lot 0) — fail-soft.
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

import { loadContext, saveContext, purgeUserContext, userContextKey, TTL_USER } from '@/lib/ia/context'

beforeEach(() => {
  mockGet.mockReset()
  mockSet.mockReset()
  mockDel.mockReset()
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

// ── Continuité cross-canal (#3/#4) : clé unifiée par utilisateur ──────────────

test('userContextKey : ancre la mémoire sur le cjsUid (indépendant du canal)', () => {
  expect(userContextKey('u-1')).toBe('user:u-1')
  // Web et WhatsApp d'une même personne → MÊME clé → mémoire partagée.
  expect(userContextKey('u-1')).toBe(userContextKey('u-1'))
  expect(userContextKey('u-1')).not.toBe(userContextKey('u-2'))
})

test('purgeUserContext : efface la clé user (droit à l’oubli)', async () => {
  mockDel.mockResolvedValueOnce(1)
  await purgeUserContext('u-9')
  expect(mockDel).toHaveBeenCalledWith('yaye:ctx:user:u-9')

  mockDel.mockRejectedValueOnce(new Error('redis down'))
  await expect(purgeUserContext('u-9')).resolves.toBeUndefined() // fail-soft
})

test('continuité : un tour WhatsApp est relu côté web (même clé user)', async () => {
  const key = userContextKey('u-7')
  mockSet.mockResolvedValueOnce('OK')
  await saveContext(key, [{ role: 'user', content: 'depuis whatsapp' }], TTL_USER)
  expect(mockSet).toHaveBeenCalledWith('yaye:ctx:user:u-7', expect.any(String), 'EX', TTL_USER)

  mockGet.mockResolvedValueOnce(JSON.stringify([{ role: 'user', content: 'depuis whatsapp' }]))
  expect(await loadContext(key)).toEqual([{ role: 'user', content: 'depuis whatsapp' }])
  expect(mockGet).toHaveBeenCalledWith('yaye:ctx:user:u-7')
})
