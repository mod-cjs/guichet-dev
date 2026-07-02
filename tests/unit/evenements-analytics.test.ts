/**
 * @jest-environment node
 *
 * GUIC-472 — Loader analytics événements. Prisma mické SANS checkIn/reservation :
 * si le loader touchait la fréquentation, l'appel throw → garantit le découplage.
 */
jest.mock('@/lib/prisma', () => ({
  prisma: {
    evenement: { findMany: jest.fn() },
    inscriptionEvenement: { groupBy: jest.fn() },
  },
}))

import { prisma } from '@/lib/prisma'
import { getEvenementsAnalytics } from '@/lib/loaders/evenements-analytics'

const mockPrisma = prisma as unknown as {
  evenement: { findMany: jest.Mock }
  inscriptionEvenement: { groupBy: jest.Mock }
}

const FROM = new Date('2026-01-01')
const TO = new Date('2026-12-31')

beforeEach(() => {
  jest.clearAllMocks()
  mockPrisma.evenement.findMany.mockResolvedValue([
    { type: 'Formation', statut: 'termine', capaciteMax: 30, dateDebut: new Date('2026-03-10'), centre: { nom: 'Dakar' }, _count: { inscriptions: 20 } },
    { type: 'Atelier', statut: 'a_venir', capaciteMax: 10, dateDebut: new Date('2026-03-20'), centre: { nom: 'Dakar' }, _count: { inscriptions: 5 } },
    { type: 'Formation', statut: 'termine', capaciteMax: 40, dateDebut: new Date('2026-04-01'), centre: null, _count: { inscriptions: 8 } },
  ])
  // groupBy statut puis groupBy cjsUid (ordre des Promise.all)
  mockPrisma.inscriptionEvenement.groupBy
    .mockResolvedValueOnce([
      { statut: 'inscrit', _count: { _all: 18 } },
      { statut: 'present', _count: { _all: 12 } },
      { statut: 'annule', _count: { _all: 3 } },
    ])
    .mockResolvedValueOnce([{ cjsUid: 'a' }, { cjsUid: 'b' }, { cjsUid: 'c' }])
})

describe('GUIC-472 — getEvenementsAnalytics', () => {
  it('agrège total / parType / parStatut sans lire la fréquentation', async () => {
    const a = await getEvenementsAnalytics({ from: FROM, to: TO })
    expect(a.totalEvenements).toBe(3)
    expect(a.parType.find((t) => t.key === 'Formation')?.count).toBe(2)
    expect(a.parStatut.find((s) => s.key === 'termine')?.count).toBe(2)
    expect(a.totalInscriptions).toBe(33)
    expect(a.capaciteTotale).toBe(80)
  })

  it('calcule le taux de présence = present / (inscrit + present)', async () => {
    const a = await getEvenementsAnalytics({ from: FROM, to: TO })
    expect(a.presents).toBe(12)
    expect(a.confirmes).toBe(30)
    expect(a.tauxPresence).toBeCloseTo(0.4, 5)
    expect(a.participantsUniques).toBe(3)
  })

  it('classe les top centres par nombre d\'événements', async () => {
    const a = await getEvenementsAnalytics({ from: FROM, to: TO })
    expect(a.topCentres[0]).toEqual({ centreNom: 'Dakar', evenements: 2, inscriptions: 25 })
  })

  it('applique le filtre centre au where', async () => {
    await getEvenementsAnalytics({ from: FROM, to: TO, centreIds: ['c1', 'c2'] })
    const where = mockPrisma.evenement.findMany.mock.calls[0][0].where
    expect(where.centreId).toEqual({ in: ['c1', 'c2'] })
    expect(where.dateDebut).toEqual({ gte: FROM, lte: TO })
  })
})
