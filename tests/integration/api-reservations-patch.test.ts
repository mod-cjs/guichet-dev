/**
 * @jest-environment node
 *
 * Tests `PATCH /api/reservations/[id]` — workflow annulation (W5 / GUIC-384).
 */

const mockRateLimit = jest.fn().mockResolvedValue(null)
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
}))

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

const mockTrackCentreEvent = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/analytics/centre-events', () => ({
  trackCentreEvent: (...a: unknown[]) => mockTrackCentreEvent(...a),
}))

const mockFindUnique = jest.fn()
const mockUpdate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    reservation: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      update: (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))

import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/reservations/[id]/route'

function req(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/reservations/res-1'), {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function ctx(id = 'res-1') {
  return { params: Promise.resolve({ id }) }
}

const FUTURE_DATE = new Date(Date.now() + 5 * 86_400_000)
const PAST_DATE = new Date(Date.now() - 5 * 86_400_000)

const BASE_RES = {
  id: 'res-1',
  cjsUid: 'user-1',
  centreId: 'c1',
  ressourceId: 'r1',
  dateReservee: FUTURE_DATE,
  creneauDebut: '14:00',
  creneauFin: '16:00',
  statut: 'Acceptee',
  ressource: { type: 'Salle' },
  centre: { slug: 'cjs-thies' },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ cjsUid: 'user-1' })
  mockRateLimit.mockResolvedValue(null)
})

describe('PATCH /api/reservations/[id]', () => {
  it('200 — annule une réservation Acceptee future + tracking', async () => {
    mockFindUnique.mockResolvedValue(BASE_RES)
    mockUpdate.mockResolvedValue({ id: 'res-1', statut: 'AnnuleeParJeune' })
    const r = await PATCH(req({ action: 'cancel' }), ctx())
    expect(r.status).toBe(200)
    const json = await r.json()
    expect(json.data.reservation.statut).toBe('AnnuleeParJeune')
    expect(mockTrackCentreEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'centre_reservation_cancelled',
        centreId: 'c1',
        cjsUid: 'user-1',
        metadata: expect.objectContaining({ ressourceType: 'Salle', centreSlug: 'cjs-thies' }),
      }),
    )
  })

  it('401 — session absente', async () => {
    mockGetSession.mockResolvedValue(null)
    const r = await PATCH(req({ action: 'cancel' }), ctx())
    expect(r.status).toBe(401)
  })

  it('403 — réservation appartenant à un autre cjsUid', async () => {
    mockFindUnique.mockResolvedValue({ ...BASE_RES, cjsUid: 'someone-else' })
    const r = await PATCH(req({ action: 'cancel' }), ctx())
    expect(r.status).toBe(403)
  })

  it('404 — réservation introuvable', async () => {
    mockFindUnique.mockResolvedValue(null)
    const r = await PATCH(req({ action: 'cancel' }), ctx())
    expect(r.status).toBe(404)
  })

  it('409 CANNOT_CANCEL — statut Passee non annulable', async () => {
    mockFindUnique.mockResolvedValue({ ...BASE_RES, statut: 'Passee' })
    const r = await PATCH(req({ action: 'cancel' }), ctx())
    expect(r.status).toBe(409)
    const json = await r.json()
    expect(json.error.code).toBe('CANNOT_CANCEL')
  })

  it('410 ALREADY_PASSED — créneau déjà passé', async () => {
    mockFindUnique.mockResolvedValue({
      ...BASE_RES,
      dateReservee: PAST_DATE,
    })
    const r = await PATCH(req({ action: 'cancel' }), ctx())
    expect(r.status).toBe(410)
    const json = await r.json()
    expect(json.error.code).toBe('ALREADY_PASSED')
  })
})
