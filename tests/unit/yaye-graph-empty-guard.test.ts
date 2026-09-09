/**
 * @jest-environment node
 *
 * Détection de READ-MODEL VIDE (C.2). Le cron nocturne reconstruit le graphe en
 * `wipe:true` : pendant cette fenêtre, toute traversée renvoie 0 ligne. Sans garde,
 * Yaye répondait « je n'ai rien trouvé » (ou pire : « il ne te manque aucune
 * compétence ») au lieu de basculer sur le fallback Prisma.
 */

const mockRun = jest.fn()
const mockClose = jest.fn()
jest.mock('@/lib/neo4j', () => ({
  getNeo4jDriver: () => ({ session: () => ({ run: mockRun, close: mockClose }) }),
  neo4jDatabase: () => undefined,
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

import { Neo4jGraphAdapter } from '@/lib/ia/graph/neo4j-adapter'
import { ResilientGraphAdapter } from '@/lib/ia/graph/resilient-adapter'
import { GraphEmptyError, type GraphPort } from '@/lib/ia/graph/port'

const rec = (obj: Record<string, unknown>) => ({ get: (k: string) => obj[k] })
const scope = { cjsUid: 'u-1' }

beforeEach(() => {
  mockRun.mockReset()
  mockClose.mockReset()
})

test('résultat vide + graphe VIDE → GraphEmptyError (jamais un « rien trouvé » silencieux)', async () => {
  const adapter = new Neo4jGraphAdapter()
  mockRun
    .mockResolvedValueOnce({ records: [] }) // recherche
    .mockResolvedValueOnce({ records: [rec({ populated: false })] }) // sentinelle

  await expect(adapter.searchOpportunites({})).rejects.toBeInstanceOf(GraphEmptyError)
})

test('résultat vide mais graphe PEUPLÉ → aucun résultat métier, pas d’erreur', async () => {
  const adapter = new Neo4jGraphAdapter()
  mockRun
    .mockResolvedValueOnce({ records: [] })
    .mockResolvedValueOnce({ records: [rec({ populated: true })] })

  await expect(adapter.searchOpportunites({})).resolves.toEqual([])
})

test('la sentinelle est mémoïsée : pas de COUNT à chaque requête vide', async () => {
  let t = 0
  const adapter = new Neo4jGraphAdapter({ now: () => t })
  mockRun
    .mockResolvedValueOnce({ records: [] })
    .mockResolvedValueOnce({ records: [rec({ populated: true })] })
    .mockResolvedValueOnce({ records: [] })

  await adapter.searchOpportunites({})
  t += 1_000 // dans la fenêtre de validité
  await adapter.searchOpportunites({})

  expect(mockRun).toHaveBeenCalledTimes(3) // 2 recherches + 1 seule sentinelle
})

test('résultat non vide → aucune sentinelle (coût nul en régime normal)', async () => {
  const adapter = new Neo4jGraphAdapter()
  mockRun.mockResolvedValueOnce({
    records: [rec({ id: 'o1', slug: 's1', titre: 'T', type: 'emploi', organisation: null, region: null, deadline: null })],
  })

  await adapter.searchOpportunites({})
  expect(mockRun).toHaveBeenCalledTimes(1)
})

test('skillGap : graphe vide ne doit PAS conclure « aucune compétence manquante »', async () => {
  const adapter = new Neo4jGraphAdapter()
  mockRun
    .mockResolvedValueOnce({ records: [rec({ manquantes: [] })] })
    .mockResolvedValueOnce({ records: [rec({ populated: false })] })

  await expect(adapter.skillGap(scope, 'opp-1')).rejects.toBeInstanceOf(GraphEmptyError)
})

test('bout en bout : graphe vide → le circuit-breaker sert le fallback Prisma', async () => {
  const primary = new Neo4jGraphAdapter()
  mockRun
    .mockResolvedValueOnce({ records: [] })
    .mockResolvedValueOnce({ records: [rec({ populated: false })] })

  const fallback = {
    backend: 'prisma',
    healthcheck: jest.fn(async () => ({ ok: true, backend: 'prisma' as const })),
    searchOpportunites: jest.fn(async () => [
      { id: 'prisma-1', slug: 'p1', titre: 'Depuis Prisma', type: 'emploi', organisation: null, region: null, deadline: null },
    ]),
    skillGap: jest.fn(async () => ({ manquantes: [], formations: [] })),
    eligibleOpportunites: jest.fn(async () => []),
    collaborativeReco: jest.fn(async () => []),
    multiEntityPath: jest.fn(async () => []),
    livresDisponibles: jest.fn(async () => []),
    ressourcesPourCompetences: jest.fn(async () => []),
  } as unknown as GraphPort

  const port = new ResilientGraphAdapter(primary, fallback, { cooldownMs: 1_000, now: () => 0 })
  const out = await port.searchOpportunites({})

  expect(out[0].id).toBe('prisma-1')
  expect(fallback.searchOpportunites).toHaveBeenCalled()
})
