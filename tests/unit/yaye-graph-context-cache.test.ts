/**
 * @jest-environment node
 *
 * Contexte graphe MÉMOÏSÉ (C.3). Il n'était calculé qu'au tout premier tour ; comme
 * l'historique conversationnel est unifié par utilisateur et glissant sur 7 jours, un
 * jeune actif ne le recevait plus jamais. Il est désormais injecté à chaque tour, la
 * traversée n'étant payée qu'une fois par 24 h (et invalidée quand ses données changent).
 */

const store = new Map<string, string>()
const mockGet = jest.fn(async (k: string) => (store.has(k) ? store.get(k)! : null))
const mockSet = jest.fn(async (k: string, v: string) => { store.set(k, v); return 'OK' })
const mockDel = jest.fn(async (k: string) => { store.delete(k); return 1 })
jest.mock('@/lib/redis', () => ({ redis: { get: (...a: [string]) => mockGet(...a), set: (...a: [string, string]) => mockSet(...a), del: (...a: [string]) => mockDel(...a) } }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

const eligibles = jest.fn(async () => [{ id: 'o1', slug: 's1', titre: 'Stage agro', type: 'stage', organisation: null, region: 'Thies', deadline: null }])
const collab = jest.fn(async () => [])
const skillGap = jest.fn(async () => ({ manquantes: [], formations: [] }))
jest.mock('@/lib/ia/graph', () => ({
  getGraphPort: () => ({ eligibleOpportunites: eligibles, collaborativeReco: collab, skillGap }),
}))

import { loadOrBuildGraphContext, purgeGraphContext, graphContextKey } from '@/lib/ia/graph-context'

beforeEach(() => {
  store.clear()
  jest.clearAllMocks()
})

test('1er appel : traverse le graphe puis mémoïse (TTL 24 h)', async () => {
  const ctx = await loadOrBuildGraphContext('u-1')

  expect(ctx).toContain('Stage agro')
  expect(eligibles).toHaveBeenCalledTimes(1)
  expect(mockSet).toHaveBeenCalledWith(graphContextKey('u-1'), ctx, 'EX', 24 * 3600)
})

test('appel suivant : servi par le cache, aucune traversée', async () => {
  await loadOrBuildGraphContext('u-1')
  eligibles.mockClear()

  const ctx = await loadOrBuildGraphContext('u-1')
  expect(ctx).toContain('Stage agro')
  expect(eligibles).not.toHaveBeenCalled()
})

test('un contexte VIDE est mémoïsé aussi (pas 3 traversées par message)', async () => {
  eligibles.mockResolvedValueOnce([])
  const ctx = await loadOrBuildGraphContext('u-2')
  expect(ctx).toBe('')

  eligibles.mockClear()
  await loadOrBuildGraphContext('u-2')
  expect(eligibles).not.toHaveBeenCalled()
})

test('purge → le contexte est recalculé au prochain appel (droit à l’oubli + invalidation)', async () => {
  await loadOrBuildGraphContext('u-1')
  await purgeGraphContext('u-1')
  expect(mockDel).toHaveBeenCalledWith(graphContextKey('u-1'))

  eligibles.mockClear()
  await loadOrBuildGraphContext('u-1')
  expect(eligibles).toHaveBeenCalledTimes(1)
})

test('Redis en panne → fail-soft : on recalcule, jamais d’exception', async () => {
  mockGet.mockRejectedValueOnce(new Error('redis down'))
  mockSet.mockRejectedValueOnce(new Error('redis down'))

  await expect(loadOrBuildGraphContext('u-3')).resolves.toContain('Stage agro')
})
