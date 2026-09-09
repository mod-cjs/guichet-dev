/**
 * @jest-environment node
 *
 * Tests de la reco proactive (GUIC-434). Le graphe est le seul cerveau :
 * on vérifie que le score dérive des signaux de traversée (collaboratif +
 * éligibilité) et que la lecture sert le cache RecommandationIA.
 */

const mockPort = {
  collaborativeReco: jest.fn(),
  eligibleOpportunites: jest.fn(),
}
jest.mock('@/lib/ia/graph', () => ({ getGraphPort: () => mockPort }))

const mRecoFindMany = jest.fn()
const mRecoFindFirst = jest.fn()
const mRecoDeleteMany = jest.fn()
const mRecoCreateMany = jest.fn()
const mTransaction = jest.fn(async (...a: unknown[]) => a[0])
jest.mock('@/lib/prisma', () => ({
  prisma: {
    recommandationIA: {
      findMany: (...a: unknown[]) => mRecoFindMany(...a),
      findFirst: (...a: unknown[]) => mRecoFindFirst(...a),
      deleteMany: (...a: unknown[]) => mRecoDeleteMany(...a),
      createMany: (...a: unknown[]) => mRecoCreateMany(...a),
    },
    $transaction: (...a: unknown[]) => mTransaction(...a),
  },
}))

import { computeRecommandations, getRecommandations } from '@/lib/ia/recommandation'
import * as recommandationModule from '@/lib/ia/recommandation'

// RED (GUIC-689 P2) — `getRecommandationScore` n'existe pas encore (lecture
// cache-only pour un couple donné). Cast namespace explicite pour que ce
// commit test-only compile contre le module ACTUEL ; l'appel échoue au
// runtime (pas une fonction) tant que le commit GREEN ne l'exporte pas.
const getRecommandationScore = (
  recommandationModule as unknown as {
    getRecommandationScore: (
      cjsUid: string,
      opportuniteId: string,
    ) => Promise<{ score: number; raison: string } | null>
  }
).getRecommandationScore

beforeEach(() => {
  mockPort.collaborativeReco.mockReset()
  mockPort.eligibleOpportunites.mockReset()
  mRecoFindMany.mockReset()
  mRecoFindFirst.mockReset()
  mRecoDeleteMany.mockReset()
  mRecoCreateMany.mockReset()
  mTransaction.mockClear()
})

test('computeRecommandations : combine collaboratif + éligibilité, trie par score, raison explicite', async () => {
  mockPort.collaborativeReco.mockResolvedValueOnce([
    { id: 'A', slug: 'a', titre: 'A', popularite: 4 },
    { id: 'B', slug: 'b', titre: 'B', popularite: 1 },
  ])
  mockPort.eligibleOpportunites.mockResolvedValueOnce([
    { id: 'B', slug: 'b', titre: 'B' },
    { id: 'C', slug: 'c', titre: 'C' },
  ])

  const recos = await computeRecommandations('u-1')
  // A : 0.6*(4/4)=0.6 ; B : 0.6*(1/4)=0.15 + 0.4*(1-0/2)=0.4 = 0.55 ; C : 0.4*(1-1/2)=0.2
  expect(recos.map(r => r.opportuniteId)).toEqual(['A', 'B', 'C'])
  expect(recos[0].score).toBeCloseTo(0.6, 5)
  // CONFIDENTIALITÉ (CDP) : la raison parle de la personne, jamais d'autres usagers ni d'un nombre.
  const raisons = recos.map(r => r.raison).join(' | ')
  expect(raisons).toMatch(/ton parcours|ton niveau/)
  expect(raisons).not.toMatch(/profil\(s\)|similaire|ont postulé|\d+\s*profil/)
})

test('computeRecommandations : graphe muet → liste vide (fail-soft)', async () => {
  mockPort.collaborativeReco.mockRejectedValueOnce(new Error('neo4j down'))
  mockPort.eligibleOpportunites.mockResolvedValueOnce([])
  const recos = await computeRecommandations('u-1')
  expect(recos).toEqual([])
})

test('getRecommandations : sert le cache RecommandationIA sans recalcul', async () => {
  mRecoFindMany.mockResolvedValueOnce([
    { opportuniteId: 'A', score: 0.9, raison: 'cache' },
  ])
  const recos = await getRecommandations('u-1')
  expect(recos).toEqual([{ opportuniteId: 'A', score: 0.9, raison: 'cache' }])
  expect(mockPort.collaborativeReco).not.toHaveBeenCalled()
})

test('getRecommandations : cache vide → recalcule et persiste', async () => {
  mRecoFindMany.mockResolvedValueOnce([])
  mockPort.collaborativeReco.mockResolvedValueOnce([{ id: 'A', slug: 'a', titre: 'A', popularite: 2 }])
  mockPort.eligibleOpportunites.mockResolvedValueOnce([])

  const recos = await getRecommandations('u-1')
  expect(recos[0].opportuniteId).toBe('A')
  expect(mTransaction).toHaveBeenCalledTimes(1)
  expect(mRecoDeleteMany).toHaveBeenCalledWith({ where: { cjsUid: 'u-1' } })
})

// ── GUIC-689 P2 — getRecommandationScore : lecture CACHE-ONLY (jamais de recalcul) ──
describe('getRecommandationScore', () => {
  test('couple présent en cache → renvoie { score, raison } réels, sans recalcul', async () => {
    mRecoFindFirst.mockResolvedValueOnce({ score: 0.73, raison: 'adaptée à ton niveau d’étude et ton profil' })

    const res = await getRecommandationScore('u-1', 'opp-1')

    expect(res).toEqual({ score: 0.73, raison: 'adaptée à ton niveau d’étude et ton profil' })
    expect(mRecoFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { cjsUid: 'u-1', opportuniteId: 'opp-1' } }),
    )
    // Ne DOIT jamais déclencher un calcul coûteux (traversée graphe) dans un rendu.
    expect(mockPort.collaborativeReco).not.toHaveBeenCalled()
    expect(mockPort.eligibleOpportunites).not.toHaveBeenCalled()
    expect(mRecoDeleteMany).not.toHaveBeenCalled()
    expect(mRecoCreateMany).not.toHaveBeenCalled()
  })

  test('couple absent du cache → null (jamais de score par défaut, jamais de recalcul)', async () => {
    mRecoFindFirst.mockResolvedValueOnce(null)

    const res = await getRecommandationScore('u-1', 'opp-hors-top')

    expect(res).toBeNull()
    expect(mockPort.collaborativeReco).not.toHaveBeenCalled()
    expect(mockPort.eligibleOpportunites).not.toHaveBeenCalled()
  })
})
