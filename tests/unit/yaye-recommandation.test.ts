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
const mRecoDeleteMany = jest.fn()
const mRecoCreateMany = jest.fn()
const mTransaction = jest.fn(async (...a: unknown[]) => a[0])
jest.mock('@/lib/prisma', () => ({
  prisma: {
    recommandationIA: {
      findMany: (...a: unknown[]) => mRecoFindMany(...a),
      deleteMany: (...a: unknown[]) => mRecoDeleteMany(...a),
      createMany: (...a: unknown[]) => mRecoCreateMany(...a),
    },
    $transaction: (...a: unknown[]) => mTransaction(...a),
  },
}))

import { computeRecommandations, getRecommandations } from '@/lib/ia/recommandation'

beforeEach(() => {
  mockPort.collaborativeReco.mockReset()
  mockPort.eligibleOpportunites.mockReset()
  mRecoFindMany.mockReset()
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
