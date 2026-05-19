/**
 * @jest-environment node
 *
 * Tests d'intégration — GET /api/auth/login
 */

process.env.SSO_BASE_URL  = 'http://sso.test'
process.env.SSO_CLIENT_ID = 'guichet-test'
process.env.NEXTAUTH_URL  = 'http://localhost:3000'

import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetAuthorizationUrl = jest.fn()

jest.mock('@/lib/sso-client', () => ({
  getAuthorizationUrl: (...args: unknown[]) => mockGetAuthorizationUrl(...args),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('@/app/api/auth/login/route')

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest('http://localhost:3000/api/auth/login')
  Object.entries(cookies).forEach(([k, v]) => req.cookies.set(k, v))
  return req
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetAuthorizationUrl.mockResolvedValue({
    url:          'http://sso.test/oauth/authorize?client_id=guichet-test&state=st123',
    state:        'st123',
    pkceVerifier: 'verifier-abc',
  })
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GET /api/auth/login', () => {
  it('redirige vers l\'URL SSO', async () => {
    const res = await GET(makeRequest())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('sso.test/oauth/authorize')
  })

  it('pose le cookie pkce_verifier httpOnly (maxAge 5 min)', async () => {
    const res = await GET(makeRequest())
    const cookie = res.cookies.get('pkce_verifier')
    expect(cookie?.value).toBe('verifier-abc')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.maxAge).toBe(300)
  })

  it('pose le cookie oauth_state httpOnly (maxAge 5 min)', async () => {
    const res = await GET(makeRequest())
    const cookie = res.cookies.get('oauth_state')
    expect(cookie?.value).toBe('st123')
    expect(cookie?.httpOnly).toBe(true)
    expect(cookie?.maxAge).toBe(300)
  })

  it('supprime le cookie force_login après usage', async () => {
    const res = await GET(makeRequest({ force_login: '1' }))
    // force_login doit être supprimé
    const cookie = res.cookies.get('force_login')
    expect(cookie?.value).toBeFalsy()
  })

  it('appelle getAuthorizationUrl(undefined, false) sans force_login', async () => {
    await GET(makeRequest())
    expect(mockGetAuthorizationUrl).toHaveBeenCalledWith(undefined, false)
  })

  it('appelle getAuthorizationUrl(undefined, true) avec force_login=1', async () => {
    await GET(makeRequest({ force_login: '1' }))
    expect(mockGetAuthorizationUrl).toHaveBeenCalledWith(undefined, true)
  })

  it('ne force pas le login si force_login vaut autre chose que "1"', async () => {
    await GET(makeRequest({ force_login: '0' }))
    expect(mockGetAuthorizationUrl).toHaveBeenCalledWith(undefined, false)
  })
})
