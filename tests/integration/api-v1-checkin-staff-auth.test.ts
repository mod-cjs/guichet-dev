/**
 * @jest-environment node
 *
 * GUIC-389 FIX 1 — `/api/v1/checkin/[token]` exige une session staff.
 *
 * - 401 sans cookie staff
 * - 200 avec cookie staff
 * - ignore body.conseillerEmail (utilise staff.email)
 * - restreint au centre du staff (autres centres → 403)
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
  isAllowedStaffEmail: () => true,
}))

// GUIC-498 : la route dépend de getCheckinOperator ; on délègue au mock staff.
jest.mock('@/lib/auth/checkin-operator', () => ({
  getCheckinOperator: async () => {
    const s = await mockGetStaffSession()
    return s
      ? { kind: 'staff', activeCentreId: s.centreId, centreIds: [s.centreId], email: s.email, label: s.email }
      : null
  },
}))

const mockTrack = jest.fn().mockResolvedValue(undefined)
jest.mock('@/lib/analytics/centre-events', () => ({
  trackCentreEvent: (...a: unknown[]) => mockTrack(...a),
}))

const mockCentre = jest.fn()
const mockUser = jest.fn()
const mockCheckInCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    centre:      { findUnique: (...a: unknown[]) => mockCentre(...a) },
    utilisateur: { findUnique: (...a: unknown[]) => mockUser(...a) },
    reservation: {
      findUnique: jest.fn(),
      update:     jest.fn(),
    },
    checkIn:     { create: (...a: unknown[]) => mockCheckInCreate(...a) },
  },
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/v1/checkin/[token]/route'

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
})

describe('POST /api/v1/checkin/[token] — staff auth (GUIC-389)', () => {
  it('401 sans cookie staff', async () => {
    mockGetStaffSession.mockResolvedValue(null)
    const res = await POST(req({ centreId: 'c-1' }), ctx())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('STAFF_UNAUTHORIZED')
  })

  it('200 avec cookie staff', async () => {
    mockGetStaffSession.mockResolvedValue({ email: 'agent@cjs.sn', centreId: 'c-1' })
    const res = await POST(req({ centreId: 'c-1' }), ctx())
    expect(res.status).toBe(200)
  })

  it('ignore body.conseillerEmail — utilise staff.email côté serveur', async () => {
    mockGetStaffSession.mockResolvedValue({ email: 'agent@cjs.sn', centreId: 'c-1' })
    const res = await POST(
      req({ centreId: 'c-1', conseillerEmail: 'attaquant@evil.com' }),
      ctx(),
    )
    expect(res.status).toBe(200)
    const createArg = mockCheckInCreate.mock.calls[0][0]
    expect(createArg.data.conseillerEmail).toBe('agent@cjs.sn')
  })

  it('403 si le staff tente un check-in sur un autre centre que le sien', async () => {
    mockGetStaffSession.mockResolvedValue({ email: 'agent@cjs.sn', centreId: 'c-1' })
    const res = await POST(req({ centreId: 'c-2' }), ctx())
    expect(res.status).toBe(403)
    const json = await res.json()
    expect(json.error.code).toBe('CENTRE_FORBIDDEN')
  })
})
