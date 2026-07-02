/**
 * @jest-environment node
 *
 * GUIC-484 (US-2) — 4 KPI du dashboard recruteur.
 * Vérifie les 2 nouveaux indicateurs RÉELS : `vuesTotales` (somme des vues) et
 * `candidaturesCetteSemaine` (candidatures des 7 derniers jours), sans casser l'existant.
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: { count: jest.fn(), findMany: jest.fn(), aggregate: jest.fn() },
    candidature: { count: jest.fn(), findMany: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { getRecruteurDashboard } from '@/lib/loaders/recruteur'

const p = prisma as unknown as {
  opportunite: { count: jest.Mock; findMany: jest.Mock; aggregate: jest.Mock }
  candidature: { count: jest.Mock; findMany: jest.Mock }
}

beforeEach(() => {
  jest.clearAllMocks()
  p.opportunite.count.mockResolvedValue(3)
  p.candidature.count.mockResolvedValue(5)
  p.opportunite.aggregate.mockResolvedValue({ _sum: { vues: 42 } })
  p.opportunite.findMany.mockResolvedValue([])
  p.candidature.findMany.mockResolvedValue([])
})

describe('GUIC-484 — getRecruteurDashboard : 4 KPI', () => {
  it('expose vuesTotales via aggregate _sum.vues', async () => {
    const d = await getRecruteurDashboard('rec-1', 'org-1')
    expect(d.vuesTotales).toBe(42)
    expect(p.opportunite.aggregate).toHaveBeenCalledWith(expect.objectContaining({ _sum: { vues: true } }))
  })

  it('vuesTotales = 0 quand aucune vue (aggregate _sum null)', async () => {
    p.opportunite.aggregate.mockResolvedValue({ _sum: { vues: null } })
    const d = await getRecruteurDashboard('rec-1', 'org-1')
    expect(d.vuesTotales).toBe(0)
  })

  it('expose candidaturesCetteSemaine avec un filtre soumiseA >= J-7', async () => {
    const d = await getRecruteurDashboard('rec-1', 'org-1')
    expect(typeof d.candidaturesCetteSemaine).toBe('number')
    const weekly = p.candidature.count.mock.calls.find(([arg]) => arg?.where?.soumiseA?.gte instanceof Date)
    expect(weekly).toBeTruthy()
  })

  it('conserve les KPI existants (offresActives, candidaturesRecues, aExaminer)', async () => {
    const d = await getRecruteurDashboard('rec-1', 'org-1')
    expect(d.offresActives).toBe(3)
    expect(d.candidaturesRecues).toBe(5)
    expect(d.aExaminer).toBe(5)
  })
})
