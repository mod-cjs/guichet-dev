/**
 * @jest-environment node
 *
 * Tests d'intégration cron batch reservations (GUIC-392 / Lot 7 Wave 5).
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 5 —
 *   "Job batch quotidien : marque Passee ou NonHonoree".
 */

import { NextRequest } from 'next/server'

const mockReservationFindMany = jest.fn()
const mockReservationUpdate = jest.fn()

const mockIsEnabled = jest.fn(async () => true)
jest.mock('@/lib/flags', () => ({ isEnabled: () => mockIsEnabled() }))
jest.mock('@/lib/flags/guard', () => ({ cronCourtCircuite: async () => false }))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    reservation: {
      findMany: (...a: unknown[]) => mockReservationFindMany(...a),
      update: (...a: unknown[]) => mockReservationUpdate(...a),
    },
  },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/cron/reservations-batch/route')

function req(authHeader?: string): NextRequest {
  return new NextRequest('http://localhost/api/cron/reservations-batch', {
    headers: authHeader ? { authorization: authHeader } : {},
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  process.env.CRON_SECRET = 'secret-cron'
})

describe('GET /api/cron/reservations-batch', () => {
  it('renvoie 401 sans header d’autorisation', async () => {
    const res = await route.GET(req())
    expect(res.status).toBe(401)
    expect(mockReservationFindMany).not.toHaveBeenCalled()
  })

  it('renvoie 401 avec Bearer incorrect', async () => {
    const res = await route.GET(req('Bearer wrong'))
    expect(res.status).toBe(401)
    expect(mockReservationFindMany).not.toHaveBeenCalled()
  })

  it('renvoie 200 + bilan vide si aucune réservation à traiter', async () => {
    mockReservationFindMany.mockResolvedValueOnce([])
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toMatchObject({ passees: 0, nonHonorees: 0, total: 0 })
    expect(mockReservationUpdate).not.toHaveBeenCalled()
  })

  it('bascule Acceptee → Passee si CheckIn associé', async () => {
    mockReservationFindMany.mockResolvedValueOnce([
      { id: 'r-1', statut: 'Acceptee', checkIns: [{ id: 'c-1' }] },
    ])
    mockReservationUpdate.mockResolvedValue({})
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(200)
    expect(mockReservationUpdate).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data: { statut: 'Passee' },
    })
    const body = await res.json()
    expect(body.data).toMatchObject({ passees: 1, nonHonorees: 0, total: 1 })
  })

  it('bascule Acceptee → NonHonoree si pas de CheckIn', async () => {
    mockReservationFindMany.mockResolvedValueOnce([
      { id: 'r-2', statut: 'Acceptee', checkIns: [] },
    ])
    mockReservationUpdate.mockResolvedValue({})
    const res = await route.GET(req('Bearer secret-cron'))
    expect(res.status).toBe(200)
    expect(mockReservationUpdate).toHaveBeenCalledWith({
      where: { id: 'r-2' },
      data: { statut: 'NonHonoree' },
    })
    const body = await res.json()
    expect(body.data).toMatchObject({ passees: 0, nonHonorees: 1, total: 1, pointageMasque: false })
  })

  it('le filtre Prisma ne sélectionne que les Acceptee dont la date est passée', async () => {
    mockReservationFindMany.mockResolvedValueOnce([])
    await route.GET(req('Bearer secret-cron'))
    expect(mockReservationFindMany).toHaveBeenCalledTimes(1)
    const arg = mockReservationFindMany.mock.calls[0][0]
    expect(arg.where.statut).toBe('Acceptee')
    expect(arg.where.dateReservee).toBeDefined()
    expect(arg.where.dateReservee.lt).toBeInstanceOf(Date)
    expect(arg.include?.checkIns).toBeDefined()
  })
})

describe('GUIC-706 — bénéfice du doute quand le pointage est masqué', () => {
  it('clôt en Passee au lieu de NonHonoree', async () => {
    // Le batch conclut à l'absence quand aucun passage badgé n'est associé. Pointage
    // masqué, PERSONNE ne peut badger : sans cette règle, tous les jeunes venus au
    // rendez-vous seraient enregistrés absents EN BASE — et `no_show` part au Data Hub
    // en tier public, donc hors de la plateforme, sans rappel possible.
    mockIsEnabled.mockResolvedValueOnce(false)
    mockReservationFindMany.mockResolvedValueOnce([
      { id: 'r-1', checkIns: [] },
    ] as never)

    const res = await route.GET(req('Bearer secret-cron'))
    expect(mockReservationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ statut: 'Passee' }) }),
    )
    const body = await res.json()
    expect(body.data).toMatchObject({ passees: 1, nonHonorees: 0, pointageMasque: true })
  })

  it('trace le motif de la clôture', async () => {
    // Sans motif, l'analyse ne peut pas distinguer une présence réelle d'une présomption,
    // et le taux de fréquentation devient faux sans qu'on puisse le corriger.
    mockIsEnabled.mockResolvedValueOnce(false)
    mockReservationFindMany.mockResolvedValueOnce([{ id: 'r-1', checkIns: [] }] as never)
    await route.GET(req('Bearer secret-cron'))
    expect(mockReservationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ raisonRefusOuAnnul: expect.stringContaining('pointage masqué') }),
      }),
    )
  })

  it('ne présume rien quand le pointage est ouvert', async () => {
    mockIsEnabled.mockResolvedValueOnce(true)
    mockReservationFindMany.mockResolvedValueOnce([{ id: 'r-1', checkIns: [] }] as never)
    await route.GET(req('Bearer secret-cron'))
    expect(mockReservationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ statut: 'NonHonoree' }) }),
    )
  })
})
