/**
 * @jest-environment node
 *
 * GUIC-387 — POST /api/v1/checkin/[token] : 200, 401, 410 expired, 409 replay,
 * 404 reservation, statut update.
 */

const mockRateLimit = jest.fn().mockResolvedValue(null)
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
}))

const mockRedisSet = jest.fn()
const mockRedisDel = jest.fn().mockResolvedValue(1)
jest.mock('@/lib/redis', () => ({
  redis: {
    set: (...a: unknown[]) => mockRedisSet(...a),
    del: (...a: unknown[]) => mockRedisDel(...a),
  },
}))

const mockVerify = jest.fn()
jest.mock('@/lib/auth/verifyCJSCardToken', () => {
  class CJSCardTokenError extends Error {
    constructor(public reason: 'expired' | 'invalid') {
      super(reason)
      this.name = 'CJSCardTokenError'
    }
  }
  return {
    verifyCJSCardToken: (...a: unknown[]) => mockVerify(...a),
    CJSCardTokenError,
  }
})

const mockGetStaffSession = jest.fn()
jest.mock('@/lib/auth/staff-session', () => ({
  getStaffSession: (...a: unknown[]) => mockGetStaffSession(...a),
  isAllowedStaffEmail: (email: string) =>
    ['agent@cjs.sn'].includes(email.toLowerCase()),
}))

const mockTrack = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/analytics/centre-events', () => ({
  trackCentreEvent: (...a: unknown[]) => mockTrack(...a),
}))

const mockCentre = jest.fn()
const mockUser   = jest.fn()
const mockResaFind = jest.fn()
const mockResaUpdate = jest.fn()
const mockCheckInCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    centre:      { findUnique: (...a: unknown[]) => mockCentre(...a) },
    utilisateur: { findUnique: (...a: unknown[]) => mockUser(...a) },
    reservation: {
      findUnique: (...a: unknown[]) => mockResaFind(...a),
      update:     (...a: unknown[]) => mockResaUpdate(...a),
    },
    checkIn:     { create: (...a: unknown[]) => mockCheckInCreate(...a) },
  },
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/checkin/[token]/route'
import { CJSCardTokenError } from '@/lib/auth/verifyCJSCardToken'

function req(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/v1/checkin/tok'), {
    method:  'POST',
    body:    JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}
const ctx = (token = 'tok') => ({ params: Promise.resolve({ token }) })

beforeEach(() => {
  jest.clearAllMocks()
  mockRateLimit.mockResolvedValue(null)
  mockVerify.mockResolvedValue({ sub: 'user-1', nonce: 'n-1', iat: 1, exp: 9 })
  mockRedisSet.mockResolvedValue('OK')
  mockCentre.mockResolvedValue({ id: 'c-1' })
  mockUser.mockResolvedValue({ cjsUid: 'user-1', nom: 'Diop', prenom: 'Awa' })
  mockCheckInCreate.mockResolvedValue({ id: 'chk-1' })
  // GUIC-389 : staff par défaut connecté
  mockGetStaffSession.mockResolvedValue({ email: 'agent@cjs.sn', centreId: 'c-1' })
})

describe('POST /api/v1/checkin/[token]', () => {
  it('200 — check-in standalone (sans réservation)', async () => {
    const res = await POST(
      req({ centreId: 'c-1', conseillerEmail: 'agent@cjs.sn' }),
      ctx(),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.checkInId).toBe('chk-1')
    expect(json.data.jeuneName).toBe('Awa Diop')
    expect(json.data.reservationStatut).toBeUndefined()
    expect(mockRedisSet).toHaveBeenCalledWith('checkin:n-1', '1', 'EX', expect.any(Number), 'NX')
    expect(mockTrack).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'centre_checkin_completed', centreId: 'c-1', cjsUid: 'user-1' }),
    )
  })

  it('200 — check-in avec réservation : statut → Passee', async () => {
    mockResaFind.mockResolvedValue({ id: 'r-1', cjsUid: 'user-1', centreId: 'c-1', statut: 'Acceptee' })
    mockResaUpdate.mockResolvedValue({})
    const res = await POST(
      req({ centreId: 'c-1', conseillerEmail: 'agent@cjs.sn', reservationId: 'r-1' }),
      ctx(),
    )
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.reservationStatut).toBe('Passee')
    expect(mockResaUpdate).toHaveBeenCalledWith({
      where: { id: 'r-1' },
      data:  { statut: 'Passee' },
    })
  })

  it('401 — pas de session staff (cookie absent)', async () => {
    mockGetStaffSession.mockResolvedValueOnce(null)
    const res = await POST(
      req({ centreId: 'c-1', conseillerEmail: 'inconnu@x.com' }),
      ctx(),
    )
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('STAFF_UNAUTHORIZED')
  })

  it('410 — token expiré', async () => {
    mockVerify.mockImplementationOnce(() => {
      throw new CJSCardTokenError('expired')
    })
    const res = await POST(
      req({ centreId: 'c-1', conseillerEmail: 'agent@cjs.sn' }),
      ctx(),
    )
    expect(res.status).toBe(410)
    const json = await res.json()
    expect(json.error.code).toBe('TOKEN_EXPIRED')
  })

  it('409 — nonce déjà consommé (replay)', async () => {
    mockRedisSet.mockResolvedValueOnce(null)
    const res = await POST(
      req({ centreId: 'c-1', conseillerEmail: 'agent@cjs.sn' }),
      ctx(),
    )
    expect(res.status).toBe(409)
    const json = await res.json()
    expect(json.error.code).toBe('ALREADY_USED')
  })

  it('404 — reservationId fourni mais introuvable / mauvais centre', async () => {
    mockResaFind.mockResolvedValue(null)
    const res = await POST(
      req({ centreId: 'c-1', conseillerEmail: 'agent@cjs.sn', reservationId: 'r-x' }),
      ctx(),
    )
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.code).toBe('RESERVATION_NOT_FOUND')
    // GUIC-389 : on ne libère plus le nonce — anti-replay strict.
    expect(mockRedisDel).not.toHaveBeenCalled()
  })
})
