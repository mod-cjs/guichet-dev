/**
 * @jest-environment node
 *
 * Transcript d'AFFICHAGE Yaye (restauration texte + cards) — fail-soft, borné, TTL.
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

import { loadViewTranscript, appendViewTurn, purgeViewTranscript, viewKey } from '@/lib/ia/transcript-view'
import type { YayeBlock } from '@/lib/ia/blocks'

const oppBlock: YayeBlock = {
  kind: 'opportunites',
  items: [{ id: '1', slug: 's', titre: 'T', type: 'Emploi', organisation: null, region: null, deadline: null }],
}

beforeEach(() => {
  mockGet.mockReset()
  mockSet.mockReset()
  mockDel.mockReset()
})

test('viewKey : ancré sur le cjsUid (indépendant du canal)', () => {
  expect(viewKey('u-1')).toBe('yaye:view:user:u-1')
  expect(viewKey('u-1')).not.toBe(viewKey('u-2'))
})

test('load : parse les tours (texte + blocks)', async () => {
  const turns = [
    { role: 'user', text: 'un stage à Thiès', ts: 1 },
    { role: 'assistant', text: 'Voici pour toi.', blocks: [oppBlock], sessionId: 'sess-1', tourIndex: 0, ts: 1 },
  ]
  mockGet.mockResolvedValueOnce(JSON.stringify(turns))
  expect(await loadViewTranscript('u-1')).toEqual(turns)
  expect(mockGet).toHaveBeenCalledWith('yaye:view:user:u-1')
})

test('load : clé absente → []', async () => {
  mockGet.mockResolvedValueOnce(null)
  expect(await loadViewTranscript('u-1')).toEqual([])
})

test('load : FAIL-SOFT (Redis throw) → []', async () => {
  mockGet.mockRejectedValueOnce(new Error('redis down'))
  expect(await loadViewTranscript('u-1')).toEqual([])
})

test('append : ajoute le tour (user + assistant avec blocks) et pose le TTL 7j', async () => {
  mockGet.mockResolvedValueOnce(null) // pas d'historique préalable
  mockSet.mockResolvedValueOnce('OK')
  await appendViewTurn(
    'u-1',
    'un stage à Thiès',
    { text: 'Voici pour toi.', blocks: [oppBlock], sessionId: 'sess-1', tourIndex: 0 },
    42,
  )
  expect(mockSet).toHaveBeenCalledWith('yaye:view:user:u-1', expect.any(String), 'EX', 7 * 24 * 3600)
  const stored = JSON.parse(mockSet.mock.calls[0][1] as string)
  expect(stored).toEqual([
    { role: 'user', text: 'un stage à Thiès', ts: 42 },
    { role: 'assistant', text: 'Voici pour toi.', blocks: [oppBlock], sessionId: 'sess-1', tourIndex: 0, ts: 42 },
  ])
})

test('append : borne à 40 messages (les plus anciens tombent)', async () => {
  // 40 messages déjà stockés → après un nouveau tour (2 msgs) on reste à 40.
  const prev = Array.from({ length: 40 }, (_, i) => ({ role: 'user' as const, text: `m${i}`, ts: i }))
  mockGet.mockResolvedValueOnce(JSON.stringify(prev))
  mockSet.mockResolvedValueOnce('OK')
  await appendViewTurn('u-1', 'nouveau', { text: 'ok', blocks: [], sessionId: 's', tourIndex: 20 }, 99)
  const stored = JSON.parse(mockSet.mock.calls[0][1] as string)
  expect(stored).toHaveLength(40)
  expect(stored[stored.length - 1]).toMatchObject({ role: 'assistant', text: 'ok', ts: 99 })
  expect(stored[stored.length - 2]).toMatchObject({ role: 'user', text: 'nouveau', ts: 99 })
})

test('append : FAIL-SOFT (Redis throw ne casse pas la conversation)', async () => {
  mockGet.mockResolvedValueOnce(null)
  mockSet.mockRejectedValueOnce(new Error('redis down'))
  await expect(
    appendViewTurn('u-1', 'x', { text: 'y', blocks: [], sessionId: 's', tourIndex: 0 }, 1),
  ).resolves.toBeUndefined()
})

test('purge : efface la clé (droit à l’oubli) + fail-soft', async () => {
  mockDel.mockResolvedValueOnce(1)
  await purgeViewTranscript('u-9')
  expect(mockDel).toHaveBeenCalledWith('yaye:view:user:u-9')

  mockDel.mockRejectedValueOnce(new Error('redis down'))
  await expect(purgeViewTranscript('u-9')).resolves.toBeUndefined()
})
