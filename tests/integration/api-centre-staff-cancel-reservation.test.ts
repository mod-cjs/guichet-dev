/**
 * @jest-environment node
 *
 * GUIC-395 — Tests `POST /api/centre-staff/[centreId]/reservations/[id]/cancel`
 * (annulation côté staff centre, Lot 7 W6 MVP).
 *
 * 5 tests : 401 sans staff, 403 mauvais centre, 404 reservation absente,
 * 409 statut non annulable, 200 OK + tracking.
 */

const mockRateLimit = jest.fn().mockResolvedValue(null)
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
}))

const mockGetStaffSession = jest.fn()
jest.mock('@/lib/auth/staff-session', () => ({
  getStaffSession: (...a: unknown[]) => mockGetStaffSession(...a),
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
      update:     (...a: unknown[]) => mockUpdate(...a),
    },
  },
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/centre-staff/[centreId]/reservations/[id]/cancel/route'

const CENTRE_ID = 'c-1'
const RESA_ID = 'r-1'

function req(body: unknown = {}): NextRequest {
  return new NextRequest(
    new URL(`http://localhost/api/centre-staff/${CENTRE_ID}/reservations/${RESA_ID}/cancel`),
    {
      method:  'POST',
      body:    JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    },
  )
}

function ctx(centreId = CENTRE_ID, id = RESA_ID) {
  return { params: Promise.resolve({ centreId, id }) }
}

const BASE_RES = {
  id:        RESA_ID,
  centreId:  CENTRE_ID,
  statut:    'Acceptee' as const,
  ressource: { type: 'Salle' },
  centre:    { slug: 'cjs-dakar' },
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetStaffSession.mockResolvedValue({ email: 'agent@cjs.sn', centreId: CENTRE_ID })
  mockRateLimit.mockResolvedValue(null)
})

describe('POST /api/centre-staff/[centreId]/reservations/[id]/cancel', () => {
  it('401 STAFF_UNAUTHORIZED — pas de session staff', async () => {
    mockGetStaffSession.mockResolvedValue(null)
    const r = await POST(req(), ctx())
    expect(r.status).toBe(401)
    const json = await r.json()
    expect(json.error.code).toBe('STAFF_UNAUTHORIZED')
  })

  it('403 CENTRE_FORBIDDEN — staff appartient à un autre centre', async () => {
    mockGetStaffSession.mockResolvedValue({ email: 'agent@cjs.sn', centreId: 'c-autre' })
    const r = await POST(req(), ctx())
    expect(r.status).toBe(403)
    const json = await r.json()
    expect(json.error.code).toBe('CENTRE_FORBIDDEN')
  })

  it('404 NOT_FOUND — réservation absente', async () => {
    mockFindUnique.mockResolvedValue(null)
    const r = await POST(req(), ctx())
    expect(r.status).toBe(404)
    const json = await r.json()
    expect(json.error.code).toBe('NOT_FOUND')
  })

  it('409 CANNOT_CANCEL — statut Passee non annulable', async () => {
    mockFindUnique.mockResolvedValue({ ...BASE_RES, statut: 'Passee' })
    const r = await POST(req(), ctx())
    expect(r.status).toBe(409)
    const json = await r.json()
    expect(json.error.code).toBe('CANNOT_CANCEL')
  })

  it('200 OK — annule + raison body + tracking event', async () => {
    mockFindUnique.mockResolvedValue(BASE_RES)
    mockUpdate.mockResolvedValue({ id: RESA_ID, statut: 'AnnuleeParJeune' })
    const r = await POST(req({ raison: 'Centre fermé exceptionnellement' }), ctx())
    expect(r.status).toBe(200)
    const json = await r.json()
    expect(json.data.id).toBe(RESA_ID)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: RESA_ID },
        data: expect.objectContaining({
          raisonRefusOuAnnul: 'Centre fermé exceptionnellement',
          annuleeA: expect.any(Date),
        }),
      }),
    )
    expect(mockTrackCentreEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type:     'centre_reservation_cancelled_by_staff',
        centreId: CENTRE_ID,
        metadata: expect.objectContaining({
          staffEmail: 'agent@cjs.sn',
          hasRaison:  true,
        }),
      }),
    )
  })
})
