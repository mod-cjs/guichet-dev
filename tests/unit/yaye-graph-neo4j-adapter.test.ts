/**
 * @jest-environment node
 *
 * Tests de l'adapter Neo4j — traversées riches (GUIC-433).
 * Driver/session mockés : on vérifie le passage des paramètres aux templates et
 * le mapping des records. Complète les tests du fallback Prisma (parité de surface).
 */

const mockRun = jest.fn()
const mockClose = jest.fn()
jest.mock('@/lib/neo4j', () => ({
  getNeo4jDriver: () => ({ session: () => ({ run: mockRun, close: mockClose }) }),
  neo4jDatabase: () => undefined,
}))

import { Neo4jGraphAdapter } from '@/lib/ia/graph/neo4j-adapter'

/** Fabrique un record Neo4j minimal (interface `.get(key)`). */
const rec = (obj: Record<string, unknown>) => ({ get: (k: string) => obj[k] })
const oppRec = (over: Record<string, unknown> = {}) =>
  rec({ id: 'o1', slug: 's1', titre: 'Offre', type: 'emploi', organisation: 'ACME', region: 'Dakar', deadline: null, ...over })

const scope = { cjsUid: 'u-1', roles: ['beneficiaire'] }
const adapter = new Neo4jGraphAdapter()

beforeEach(() => {
  mockRun.mockReset()
  mockClose.mockReset()
})

test('skillGap : 2 requêtes (manquantes puis formations), mapping + slugs en param', async () => {
  mockRun
    .mockResolvedValueOnce({ records: [rec({ manquantes: [{ slug: 'react', libelle: 'React' }] })] })
    .mockResolvedValueOnce({ records: [oppRec({ id: 'f1', titre: 'Form React' })] })

  const gap = await adapter.skillGap(scope, 'opp-X')
  expect(gap.manquantes).toEqual([{ slug: 'react', libelle: 'React' }])
  expect(gap.formations[0]).toMatchObject({ id: 'f1', titre: 'Form React', organisation: 'ACME' })
  // 1re requête bornée au cjsUid + oppId
  expect(mockRun.mock.calls[0][1]).toMatchObject({ uid: 'u-1', oppId: 'opp-X' })
  // 2e requête reçoit les slugs manquants
  expect(mockRun.mock.calls[1][1].slugs).toEqual(['react'])
  expect(mockClose).toHaveBeenCalledTimes(2)
})

test('skillGap : aucune manquante → pas de requête formations', async () => {
  mockRun.mockResolvedValueOnce({ records: [rec({ manquantes: [] })] })
  const gap = await adapter.skillGap(scope, 'opp-X')
  expect(gap.manquantes).toHaveLength(0)
  expect(gap.formations).toHaveLength(0)
  expect(mockRun).toHaveBeenCalledTimes(1)
})

test('eligibleOpportunites : lit le niveau puis injecte allowedNiveaux', async () => {
  mockRun
    .mockResolvedValueOnce({ records: [rec({ niveau: 'BAC' })] })
    .mockResolvedValueOnce({ records: [oppRec()] })

  const out = await adapter.eligibleOpportunites(scope)
  expect(out[0].id).toBe('o1')
  expect(mockRun.mock.calls[1][1]).toMatchObject({ uid: 'u-1', allowedNiveaux: ['BFEM', 'BAC'] })
})

test('collaborativeReco : mappe id/slug/titre/popularite (sortie agrégée)', async () => {
  mockRun.mockResolvedValueOnce({ records: [rec({ id: 'B', slug: 'b', titre: 'Offre B', popularite: 3 })] })
  const out = await adapter.collaborativeReco(scope)
  expect(out[0]).toEqual({ id: 'B', slug: 'b', titre: 'Offre B', popularite: 3 })
})

test('multiEntityPath : mappe la chaîne offre→compétence→formation→programme', async () => {
  mockRun.mockResolvedValueOnce({
    records: [rec({ id: 'o1', slug: 's1', titre: 'Offre', competence: 'React', formationTitre: 'Form', programmeNom: 'YEAH' })],
  })
  const out = await adapter.multiEntityPath({ domaine: 'Numerique', region: 'Dakar' })
  expect(out[0]).toMatchObject({ id: 'o1', competence: 'React', formationTitre: 'Form', programmeNom: 'YEAH' })
  expect(mockRun.mock.calls[0][1]).toMatchObject({ domaine: 'Numerique', region: 'Dakar' })
})
