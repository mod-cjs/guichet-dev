/**
 * @jest-environment node
 *
 * Tests `getCentresAnalytics` — loader admin dashboard centres
 * (Lot 7 Wave 6.3 / GUIC-388).
 *
 * Prisma mocké : on vérifie les agrégations (KPIs, byDay, top, byType,
 * byStatut) + l'application du filtre `centreIds`.
 */

const mockReservationGroupBy = jest.fn()
const mockReservationFindMany = jest.fn()
const mockReservationCount = jest.fn()
const mockCheckInFindMany = jest.fn()
const mockCentreFindMany = jest.fn()
const mockRessourceFindMany = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    reservation: {
      groupBy: (...a: unknown[]) => mockReservationGroupBy(...a),
      findMany: (...a: unknown[]) => mockReservationFindMany(...a),
      count: (...a: unknown[]) => mockReservationCount(...a),
    },
    checkIn: { findMany: (...a: unknown[]) => mockCheckInFindMany(...a) },
    centre: { findMany: (...a: unknown[]) => mockCentreFindMany(...a) },
    ressourceCentre: { findMany: (...a: unknown[]) => mockRessourceFindMany(...a) },
  },
}))

/** Fabrique n check-ins (q en QrCard, le reste en Manuel) à une date donnée. */
function checkins(q: number, manuel: number, date = new Date('2026-05-10T10:00:00Z')) {
  return [
    ...Array.from({ length: q }, () => ({ effectueA: date, via: 'QrCard' as const })),
    ...Array.from({ length: manuel }, () => ({ effectueA: date, via: 'Manuel' as const })),
  ]
}

import { getCentresAnalytics } from '@/lib/loaders/centres-analytics'

beforeEach(() => {
  jest.clearAllMocks()
  // Defaults : tout vide.
  mockReservationGroupBy.mockResolvedValue([])
  mockReservationFindMany.mockResolvedValue([])
  mockReservationCount.mockResolvedValue(0)
  mockCheckInFindMany.mockResolvedValue([])
  mockCentreFindMany.mockResolvedValue([])
  mockRessourceFindMany.mockResolvedValue([])
})

const FROM = new Date('2026-05-01T00:00:00.000Z')
const TO = new Date('2026-05-31T23:59:59.000Z')

describe('getCentresAnalytics', () => {
  it('calcule les KPIs depuis le groupBy statut + checkIn count', async () => {
    // 1er appel groupBy : statuts. 2e : top centres. 3e : par ressource.
    mockReservationGroupBy
      .mockResolvedValueOnce([
        { statut: 'Acceptee', _count: { _all: 100 } },
        { statut: 'AnnuleeParJeune', _count: { _all: 10 } },
        { statut: 'Refusee', _count: { _all: 5 } },
        { statut: 'NonHonoree', _count: { _all: 8 } },
        { statut: 'Passee', _count: { _all: 0 } },
      ])
      .mockResolvedValueOnce([]) // top
      .mockResolvedValueOnce([]) // byRessource

    mockCheckInFindMany.mockResolvedValue(checkins(40, 20)) // 60 check-ins : 40 QR + 20 manuels
    mockReservationCount.mockResolvedValue(50) // période précédente

    const out = await getCentresAnalytics({ from: FROM, to: TO })

    expect(out.kpis.totalReservations).toBe(123)
    expect(out.kpis.totalReservationsPrev).toBe(50)
    expect(out.kpis.checkinRate).toBeCloseTo(0.6, 5) // 60 / 100
    expect(out.kpis.cancelRate).toBeCloseTo((10 + 5) / 123, 5)
    expect(out.kpis.noShowRate).toBeCloseTo(8 / 100, 5) // 8 NonHonoree / 100 acceptées
    // Ventilation des accès par QR
    expect(out.accesQr).toEqual({ total: 60, parQr: 40, parManuel: 20, tauxQr: 40 / 60 })
  })

  it('agrège reservationsByDay en remplissant les jours à zéro', async () => {
    mockReservationFindMany.mockResolvedValue([
      { dateReservee: new Date('2026-05-01T10:00:00Z') },
      { dateReservee: new Date('2026-05-01T15:00:00Z') },
      { dateReservee: new Date('2026-05-03T09:00:00Z') },
    ])

    const out = await getCentresAnalytics({
      from: new Date('2026-05-01T00:00:00Z'),
      to: new Date('2026-05-04T00:00:00Z'),
    })

    expect(out.reservationsByDay).toEqual([
      { date: '2026-05-01', count: 2 },
      { date: '2026-05-02', count: 0 },
      { date: '2026-05-03', count: 1 },
      { date: '2026-05-04', count: 0 },
    ])
  })

  it('renvoie le top 5 centres triés desc avec le nom joint', async () => {
    mockReservationGroupBy
      .mockResolvedValueOnce([]) // statuts
      .mockResolvedValueOnce([
        { centreId: 'c-tamba', _count: { _all: 42 } },
        { centreId: 'c-kolda', _count: { _all: 31 } },
      ])
      .mockResolvedValueOnce([]) // byRessource

    mockCentreFindMany.mockResolvedValue([
      { id: 'c-tamba', nom: 'CJS Tambacounda' },
      { id: 'c-kolda', nom: 'CJS Kolda' },
    ])

    const out = await getCentresAnalytics({ from: FROM, to: TO })

    expect(out.topCentres).toEqual([
      { centreId: 'c-tamba', centreNom: 'CJS Tambacounda', count: 42 },
      { centreId: 'c-kolda', centreNom: 'CJS Kolda', count: 31 },
    ])
    expect(mockReservationGroupBy.mock.calls[1][0]).toMatchObject({ take: 5 })
  })

  it('agrège byType en joignant la table RessourceCentre', async () => {
    mockReservationGroupBy
      .mockResolvedValueOnce([]) // statuts
      .mockResolvedValueOnce([]) // top
      .mockResolvedValueOnce([
        { ressourceId: 'r1', _count: { _all: 10 } },
        { ressourceId: 'r2', _count: { _all: 4 } },
        { ressourceId: 'r3', _count: { _all: 2 } },
      ])
    mockRessourceFindMany.mockResolvedValue([
      { id: 'r1', type: 'Salle' },
      { id: 'r2', type: 'Salle' },
      { id: 'r3', type: 'Vehicule' },
    ])

    const out = await getCentresAnalytics({ from: FROM, to: TO })

    const byType = Object.fromEntries(out.byType.map((b) => [b.type, b.count]))
    expect(byType.Salle).toBe(14)
    expect(byType.Vehicule).toBe(2)
  })

  it('expose byStatut depuis le groupBy statut', async () => {
    mockReservationGroupBy
      .mockResolvedValueOnce([
        { statut: 'Acceptee', _count: { _all: 12 } },
        { statut: 'Refusee', _count: { _all: 3 } },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([])

    const out = await getCentresAnalytics({ from: FROM, to: TO })

    const map = Object.fromEntries(out.byStatut.map((s) => [s.statut, s.count]))
    expect(map).toEqual({ Acceptee: 12, Refusee: 3 })
  })

  it('propage filters.centreIds vers le where Prisma', async () => {
    await getCentresAnalytics({
      from: FROM,
      to: TO,
      centreIds: ['c1', 'c2'],
    })

    // Le 1er groupBy (statuts) doit recevoir centreId.in
    const firstCall = mockReservationGroupBy.mock.calls[0][0]
    expect(firstCall.where.centreId).toEqual({ in: ['c1', 'c2'] })
    // Idem pour le findMany des check-ins
    expect(mockCheckInFindMany.mock.calls[0][0].where.centreId).toEqual({ in: ['c1', 'c2'] })
  })

  it('agrège accesQrParJour (QR uniquement) en remplissant les jours à zéro', async () => {
    mockCheckInFindMany.mockResolvedValue([
      { effectueA: new Date('2026-05-01T09:00:00Z'), via: 'QrCard' },
      { effectueA: new Date('2026-05-01T18:00:00Z'), via: 'QrCard' },
      { effectueA: new Date('2026-05-01T12:00:00Z'), via: 'Manuel' }, // exclu de la série QR
      { effectueA: new Date('2026-05-03T10:00:00Z'), via: 'QrCard' },
    ])

    const out = await getCentresAnalytics({
      from: new Date('2026-05-01T00:00:00Z'),
      to: new Date('2026-05-04T00:00:00Z'),
    })

    expect(out.accesQrParJour).toEqual([
      { date: '2026-05-01', count: 2 },
      { date: '2026-05-02', count: 0 },
      { date: '2026-05-03', count: 1 },
      { date: '2026-05-04', count: 0 },
    ])
  })
})
