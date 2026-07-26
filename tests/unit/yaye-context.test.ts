/**
 * @jest-environment node
 *
 * Contexte conversationnel Redis (GUIC-259, Lot 0) — fail-soft.
 * Stockage en LISTE depuis GUIC-678 (append atomique) : les commandes attendues sont
 * `lrange` / `rpush` / `ltrim`, plus `del` pour la purge. La concurrence elle-même est
 * couverte par `yaye-multi-session.test.ts`.
 */
const mockLrange = jest.fn()
const mockRpush = jest.fn()
const mockLtrim = jest.fn()
const mockExpire = jest.fn()
const mockDel = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: {
    lrange: (...a: unknown[]) => mockLrange(...a),
    rpush: (...a: unknown[]) => mockRpush(...a),
    ltrim: (...a: unknown[]) => mockLtrim(...a),
    expire: (...a: unknown[]) => mockExpire(...a),
    del: (...a: unknown[]) => mockDel(...a),
  },
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

import { loadContext, appendTurns, saveContext, purgeUserContext, userContextKey, TTL_USER } from '@/lib/ia/context'

beforeEach(() => {
  mockLrange.mockReset().mockResolvedValue([])
  mockRpush.mockReset().mockResolvedValue(1)
  mockLtrim.mockReset().mockResolvedValue('OK')
  mockExpire.mockReset().mockResolvedValue(1)
  mockDel.mockReset().mockResolvedValue(1)
})

test('load : lit la fenêtre récente de la liste et parse chaque tour', async () => {
  mockLrange.mockResolvedValueOnce([JSON.stringify({ role: 'user', content: 'salut' })])
  expect(await loadContext('s1')).toEqual([{ role: 'user', content: 'salut' }])
  expect(mockLrange).toHaveBeenCalledWith('yaye:ctx:s1', -20, -1)
})

test('load : clé absente → []', async () => {
  mockLrange.mockResolvedValueOnce([])
  expect(await loadContext('s1')).toEqual([])
})

test('load : entrée corrompue ignorée, les autres sont conservées', async () => {
  mockLrange.mockResolvedValueOnce(['{pas du json', JSON.stringify({ role: 'assistant', content: 'ok' })])
  expect(await loadContext('s1')).toEqual([{ role: 'assistant', content: 'ok' }])
})

test('load : FAIL-SOFT (Redis throw) → []', async () => {
  mockLrange.mockRejectedValueOnce(new Error('redis down'))
  expect(await loadContext('s1')).toEqual([])
})

test('append : rpush + bornage + TTL', async () => {
  await appendTurns('s1', [{ role: 'user', content: 'hi' }], 1800)
  expect(mockRpush).toHaveBeenCalledWith('yaye:ctx:s1', JSON.stringify({ role: 'user', content: 'hi' }))
  expect(mockLtrim).toHaveBeenCalledWith('yaye:ctx:s1', -20, -1)
  expect(mockExpire).toHaveBeenCalledWith('yaye:ctx:s1', 1800)
})

test('append : rien à écrire → aucune commande', async () => {
  await appendTurns('s1', [], 1800)
  expect(mockRpush).not.toHaveBeenCalled()
})

test('append : FAIL-SOFT (ne throw pas)', async () => {
  mockRpush.mockRejectedValueOnce(new Error('redis down'))
  await expect(appendTurns('s1', [{ role: 'user', content: 'x' }], 10)).resolves.toBeUndefined()
})

test('save : réécriture complète (purge puis liste) + TTL', async () => {
  await saveContext('s1', [{ role: 'user', content: 'hi' }], 1800)
  expect(mockDel).toHaveBeenCalledWith('yaye:ctx:s1')
  expect(mockRpush).toHaveBeenCalledWith('yaye:ctx:s1', expect.any(String))
  expect(mockExpire).toHaveBeenCalledWith('yaye:ctx:s1', 1800)
})

test('save : FAIL-SOFT (ne throw pas)', async () => {
  mockDel.mockRejectedValueOnce(new Error('redis down'))
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
  await purgeUserContext('u-9')
  expect(mockDel).toHaveBeenCalledWith('yaye:ctx:user:u-9')

  mockDel.mockRejectedValueOnce(new Error('redis down'))
  await expect(purgeUserContext('u-9')).resolves.toBeUndefined() // fail-soft
})

test('continuité : un tour WhatsApp est relu côté web (même clé user)', async () => {
  const key = userContextKey('u-7')
  await appendTurns(key, [{ role: 'user', content: 'depuis whatsapp' }], TTL_USER)
  expect(mockRpush).toHaveBeenCalledWith('yaye:ctx:user:u-7', expect.any(String))

  mockLrange.mockResolvedValueOnce([JSON.stringify({ role: 'user', content: 'depuis whatsapp' })])
  expect(await loadContext(key)).toEqual([{ role: 'user', content: 'depuis whatsapp' }])
  expect(mockLrange).toHaveBeenCalledWith('yaye:ctx:user:u-7', -20, -1)
})
