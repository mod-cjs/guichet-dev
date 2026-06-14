/**
 * @jest-environment node
 *
 * Tests `GET /api/cjs-card/qr-token` (Wave 6.1 / GUIC-386).
 *
 * Couvre : 200 OK, 401, rate-limit 429, structure payload JWT, expiresAt cohérent.
 */

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

const mockRateLimit = jest.fn().mockResolvedValue(null)
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() },
}))

import { NextRequest } from 'next/server'
import { decodeJwt, decodeProtectedHeader } from 'jose'

const SESSION = { cjsUid: 'uid-aminata' }

function req(): NextRequest {
  return new NextRequest('http://localhost/api/cjs-card/qr-token', {
    method: 'GET',
  })
}

describe('GET /api/cjs-card/qr-token', () => {
  beforeAll(() => {
    process.env.JWT_CJS_CARD_SECRET =
      '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
  })

  beforeEach(() => {
    mockGetSession.mockReset()
    mockRateLimit.mockReset().mockResolvedValue(null)
  })

  it('renvoie 200 + token + expiresAt + refreshAt', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/cjs-card/qr-token/route')
    const res = await GET(req())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeDefined()
    expect(typeof body.data.token).toBe('string')
    expect(body.data.token.split('.').length).toBe(3) // header.payload.signature
    expect(typeof body.data.expiresAt).toBe('string')
    expect(typeof body.data.refreshAt).toBe('string')
  })

  it('refuse non authentifié (401)', async () => {
    mockGetSession.mockResolvedValue(null)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/cjs-card/qr-token/route')
    const res = await GET(req())
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error?.code).toBe('UNAUTHORIZED')
  })

  it('propage le 429 du rate-limiter', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    const NextResponse = (await import('next/server')).NextResponse
    mockRateLimit.mockResolvedValueOnce(
      NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'trop' } },
        { status: 429 },
      ),
    )
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/cjs-card/qr-token/route')
    const res = await GET(req())
    expect(res.status).toBe(429)
  })

  it('le JWT contient sub=cjsUid, scope=checkin, nonce, iat, exp', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/cjs-card/qr-token/route')
    const res = await GET(req())
    const body = await res.json()
    const payload = decodeJwt(body.data.token)
    expect(payload.sub).toBe(SESSION.cjsUid)
    expect(payload.scope).toBe('checkin')
    expect(typeof payload.nonce).toBe('string')
    expect((payload.nonce as string).length).toBeGreaterThan(10)
    expect(typeof payload.iat).toBe('number')
    expect(typeof payload.exp).toBe('number')
    const header = decodeProtectedHeader(body.data.token)
    expect(header.alg).toBe('HS256')
    expect(header.kid).toBe('cjs-checkin-v1')
  })

  it('expiresAt = iat + 15 min, refreshAt = exp - 60s', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { GET } = require('@/app/api/cjs-card/qr-token/route')
    const res = await GET(req())
    const body = await res.json()
    const payload = decodeJwt(body.data.token)
    const expSec = payload.exp as number
    const iatSec = payload.iat as number
    expect(expSec - iatSec).toBe(15 * 60)
    const expiresAt = new Date(body.data.expiresAt).getTime()
    const refreshAt = new Date(body.data.refreshAt).getTime()
    expect(Math.round(expiresAt / 1000)).toBe(expSec)
    expect(Math.round((expiresAt - refreshAt) / 1000)).toBe(60)
  })
})
