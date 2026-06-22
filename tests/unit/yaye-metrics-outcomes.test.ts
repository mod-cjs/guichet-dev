/**
 * @jest-environment node
 *
 * Tests du résultat métier Yaye (GUIC-435, jalon D, couche 4).
 * Vérifie : comptage des actions via Yaye + conversion reco→candidature.
 */

const mockAgentCount = jest.fn()
const mockRecoFind = jest.fn()
const mockCandFind = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    agentLog: { count: (...a: unknown[]) => mockAgentCount(...a) },
    recommandationIA: { findMany: (...a: unknown[]) => mockRecoFind(...a) },
    candidature: { findMany: (...a: unknown[]) => mockCandFind(...a) },
  },
}))

import { computeOutcomes } from '@/lib/ia/metrics/outcomes'

beforeEach(() => {
  mockAgentCount.mockReset()
  mockRecoFind.mockReset()
  mockCandFind.mockReset()
})

test('compte les actions via Yaye et calcule la conversion reco→candidature', async () => {
  // submit_application = 3, reserve_resource = 1
  mockAgentCount.mockResolvedValueOnce(3).mockResolvedValueOnce(1)
  // 2 paires (cjsUid,opp) de recos vues
  mockRecoFind.mockResolvedValueOnce([
    { cjsUid: 'u1', opportuniteId: 'o1' },
    { cjsUid: 'u2', opportuniteId: 'o2' },
    { cjsUid: 'u1', opportuniteId: 'o1' }, // doublon → dédupliqué
  ])
  // u1/o1 a candidaté, pas u2/o2 → 1 conversion / 2 vues
  mockCandFind.mockResolvedValueOnce([{ cjsUid: 'u1', opportuniteId: 'o1' }])

  const r = await computeOutcomes({ from: new Date('2026-06-01'), to: new Date('2026-06-22') })

  expect(r.candidaturesViaYaye).toBe(3)
  expect(r.reservationsViaYaye).toBe(1)
  expect(r.recosVues).toBe(2)
  expect(r.recosConverties).toBe(1)
  expect(r.tauxConversionReco).toBeCloseTo(0.5, 5)
})

test('aucune reco vue → conversion null, pas de requête candidatures', async () => {
  mockAgentCount.mockResolvedValueOnce(0).mockResolvedValueOnce(0)
  mockRecoFind.mockResolvedValueOnce([])

  const r = await computeOutcomes()
  expect(r.recosVues).toBe(0)
  expect(r.tauxConversionReco).toBeNull()
  expect(mockCandFind).not.toHaveBeenCalled()
})
