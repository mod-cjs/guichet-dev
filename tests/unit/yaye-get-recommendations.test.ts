/**
 * @jest-environment node
 *
 * Contrat isolé de l'outil get_recommendations (le wrapper que l'agent appelle) : portée RBAC
 * (cjsUid), mapping reco→card avec la RAISON portée par la card (note), cas vide. Complète les
 * tests fonction de recommandation.ts. Déterministe → ne peut pas overfitter à une formulation.
 */
const port = { collaborativeReco: jest.fn(), eligibleOpportunites: jest.fn() }
jest.mock('@/lib/ia/graph', () => ({ getGraphPort: () => port }))

const mockGetRecommandations = jest.fn()
jest.mock('@/lib/ia/recommandation', () => ({
  getRecommandations: (...a: unknown[]) => mockGetRecommandations(...a),
  computeRecommandations: jest.fn(),
}))

const mockOppFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { opportunite: { findMany: (...a: unknown[]) => mockOppFindMany(...a) } } }))

import { TOOLS } from '@/lib/ia/tools'

const ctx = { cjsUid: 'u-1', roles: ['beneficiaire'], centreId: null, sessionId: 's', canal: 'web' as const }

beforeEach(() => jest.clearAllMocks())

test('portée RBAC : interroge la reco du cjsUid connecté', async () => {
  mockGetRecommandations.mockResolvedValueOnce([])
  await TOOLS.get_recommendations.execute({}, ctx)
  expect(mockGetRecommandations).toHaveBeenCalledWith('u-1')
})

test('aucune reco → ok, count 0, PAS de card', async () => {
  mockGetRecommandations.mockResolvedValueOnce([])
  const r = await TOOLS.get_recommendations.execute({}, ctx)
  expect(r.ok).toBe(true)
  expect((r.data as { count: number }).count).toBe(0)
  expect(r.block).toBeUndefined()
})

test('recos → card opportunites avec la RAISON portée par l’item (note)', async () => {
  mockGetRecommandations.mockResolvedValueOnce([
    { opportuniteId: 'o1', raison: 'plébiscitée par des profils comme le tien' },
  ])
  mockOppFindMany.mockResolvedValueOnce([
    { id: 'o1', slug: 'dev-web', titre: 'Développeur web', type: 'Emploi', region: 'Dakar', organisation: 'ACME', organisationLibelle: null, deadline: null, typeRef: null },
  ])

  const r = await TOOLS.get_recommendations.execute({}, ctx)

  expect(r.block?.kind).toBe('opportunites')
  if (r.block?.kind === 'opportunites') {
    expect(r.block.items[0].id).toBe('o1')
    expect(r.block.items[0].note).toBe('plébiscitée par des profils comme le tien')
    expect(r.block.items[0].titre).toBe('Développeur web')
  }
})

test('reco sans opportunité chargeable → pas de card (fail-soft)', async () => {
  mockGetRecommandations.mockResolvedValueOnce([{ opportuniteId: 'o-ghost', raison: null }])
  mockOppFindMany.mockResolvedValueOnce([]) // l'offre n'existe plus
  const r = await TOOLS.get_recommendations.execute({}, ctx)
  expect(r.ok).toBe(true)
  expect(r.block).toBeUndefined()
})
