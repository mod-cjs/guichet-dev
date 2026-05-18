/**
 * @jest-environment node
 *
 * Tests d'intégration — POST /api/auth/logout
 */

process.env.NEXTAUTH_URL = 'http://localhost:3000'

import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetSession       = jest.fn()
const mockClearSessionCookie = jest.fn()
const mockRevokeToken      = jest.fn()
const mockRevokeSession    = jest.fn()

jest.mock('@/lib/auth', () => ({
  getSession:         (...args: unknown[]) => mockGetSession(...args),
  clearSessionCookie: (...args: unknown[]) => mockClearSessionCookie(...args),
}))

jest.mock('@/lib/sso-client', () => ({
  revokeToken: (...args: unknown[]) => mockRevokeToken(...args),
}))

jest.mock('@/lib/session-store', () => ({
  revokeSession: (...args: unknown[]) => mockRevokeSession(...args),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { POST, GET } = require('@/app/api/auth/logout/route')

// ── Helpers ────────────────────────────────────────────────────────────────

function makeSession(overrides = {}) {
  return {
    cjsUid:      'uid-123',
    accessToken: 'at-xxx',
    ...overrides,
  }
}

function makePost(headers: Record<string, string> = {}): NextRequest {
  const req = new NextRequest('http://localhost:3000/api/auth/logout', { method: 'POST' })
  Object.entries(headers).forEach(([k, v]) =>
    Object.defineProperty(req.headers, 'get', {
      value: (name: string) => headers[name.toLowerCase()] ?? null,
      configurable: true,
    })
  )
  return req
}

function makePostWithOrigin(origin: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/logout', {
    method:  'POST',
    headers: { origin },
  })
}

function makePostWithReferer(referer: string): NextRequest {
  return new NextRequest('http://localhost:3000/api/auth/logout', {
    method:  'POST',
    headers: { referer },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRevokeToken.mockResolvedValue(undefined)
  mockRevokeSession.mockResolvedValue(undefined)
  mockClearSessionCookie.mockReturnValue(undefined)
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('POST /api/auth/logout — CSRF', () => {
  it('retourne 403 si origin est externe', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST(makePostWithOrigin('http://evil.com'))
    expect(res.status).toBe(403)
  })

  it('autorise si origin correspond à APP_URL', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST(makePostWithOrigin('http://localhost:3000'))
    expect(res.status).not.toBe(403)
  })

  it('autorise si referer commence par APP_URL (origin absent)', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST(makePostWithReferer('http://localhost:3000/jeune/profil'))
    expect(res.status).not.toBe(403)
  })

  it('retourne 403 si referer est externe et origin absent', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await POST(makePostWithReferer('http://evil.com/steal'))
    expect(res.status).toBe(403)
  })
})

describe('POST /api/auth/logout — révocation', () => {
  beforeEach(() => mockGetSession.mockResolvedValue(makeSession()))

  it('révoque le token SSO et la session Redis', async () => {
    const res = await POST(makePostWithOrigin('http://localhost:3000'))
    expect(mockRevokeToken).toHaveBeenCalledWith('at-xxx')
    expect(mockRevokeSession).toHaveBeenCalledWith('uid-123')
    expect(res.status).toBe(307)
  })

  it('nettoie le cookie de session', async () => {
    await POST(makePostWithOrigin('http://localhost:3000'))
    expect(mockClearSessionCookie).toHaveBeenCalled()
  })

  it('pose force_login=1 (TTL 10 min)', async () => {
    const res = await POST(makePostWithOrigin('http://localhost:3000'))
    const cookie = res.cookies.get('force_login')
    expect(cookie?.value).toBe('1')
    expect(cookie?.maxAge).toBe(600)
    expect(cookie?.httpOnly).toBe(true)
  })

  it('redirige vers / après logout', async () => {
    const res = await POST(makePostWithOrigin('http://localhost:3000'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost:3000/')
  })
})

describe('POST /api/auth/logout — sans session', () => {
  beforeEach(() => mockGetSession.mockResolvedValue(null))

  it('ne tente pas de révoquer sans session', async () => {
    await POST(makePostWithOrigin('http://localhost:3000'))
    expect(mockRevokeToken).not.toHaveBeenCalled()
    expect(mockRevokeSession).not.toHaveBeenCalled()
  })

  it('redirige quand même vers /', async () => {
    const res = await POST(makePostWithOrigin('http://localhost:3000'))
    expect(res.status).toBe(307)
  })
})

describe('POST /api/auth/logout — erreurs réseau', () => {
  beforeEach(() => mockGetSession.mockResolvedValue(makeSession()))

  it('continue si revokeToken échoue (réseau SSO down)', async () => {
    mockRevokeToken.mockRejectedValue(new Error('SSO unreachable'))
    const res = await POST(makePostWithOrigin('http://localhost:3000'))
    // Ne doit pas crash — clearSessionCookie doit quand même être appelé
    expect(mockClearSessionCookie).toHaveBeenCalled()
    expect(res.status).toBe(307)
  })

  it('continue si revokeSession échoue (Redis down)', async () => {
    mockRevokeSession.mockRejectedValue(new Error('Redis unreachable'))
    const res = await POST(makePostWithOrigin('http://localhost:3000'))
    expect(mockClearSessionCookie).toHaveBeenCalled()
    expect(res.status).toBe(307)
  })
})

describe('GET /api/auth/logout', () => {
  it('redirige vers /auth/deconnexion', async () => {
    const req = new NextRequest('http://localhost:3000/api/auth/logout')
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/deconnexion')
  })
})
