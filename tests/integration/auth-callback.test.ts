/**
 * @jest-environment node
 *
 * Tests d'intégration du handler GET /auth/callback.
 * Tout appel réseau (SSO, Prisma, Redis) est mocké.
 */

process.env.SSO_BASE_URL   = 'http://sso.test'
process.env.SSO_CLIENT_ID  = 'guichet-test'
process.env.NEXTAUTH_URL   = 'http://localhost:3000'

import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockExchangeCode  = jest.fn()
const mockGetUserInfo   = jest.fn()
const mockRevokeToken   = jest.fn()

jest.mock('@/lib/sso-client', () => ({
  exchangeCode:  (...args: unknown[]) => mockExchangeCode(...args),
  getUserInfo:   (...args: unknown[]) => mockGetUserInfo(...args),
  revokeToken:   (...args: unknown[]) => mockRevokeToken(...args),
}))

const mockEncodeSession    = jest.fn()
const mockSetSessionCookie = jest.fn()

jest.mock('@/lib/auth', () => ({
  encodeSession:    (...args: unknown[]) => mockEncodeSession(...args),
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}))


const mockUpsert = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { upsert: (...args: unknown[]) => mockUpsert(...args) },
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// Import après mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('@/app/auth/callback/route')

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(
  params: Record<string, string> = {},
  cookies: Record<string, string> = {},
): NextRequest {
  const url = new URL('http://localhost:3000/auth/callback')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))

  const req = new NextRequest(url.toString())
  Object.entries(cookies).forEach(([name, value]) => {
    req.cookies.set(name, value)
  })
  return req
}

const TOKEN_RESPONSE = {
  access_token:  'access-tok',
  refresh_token: 'refresh-tok',
  id_token:      'id-tok',
  expires_in:    3600,
  token_type:    'Bearer',
}

const SSO_CLAIMS = {
  sub:          'uid-abc',
  name:         'Fatou Diallo',
  given_name:   'Fatou',
  family_name:  'Diallo',
  email:        'fatou@example.sn',
  email_verified: true,
  phone_number: '+221770000000',
  phone_number_verified: false,
  cjs_roles:    ['beneficiaire'],
  cjs_status:   'active',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRevokeToken.mockResolvedValue(undefined)
  mockEncodeSession.mockResolvedValue('encoded-session-jwt')
  mockSetSessionCookie.mockReturnValue(undefined)
})

// ── Tests ──────────────────────────────────────────────────────────────────

describe('GET /auth/callback — état invalide', () => {
  it('redirige vers /auth/connexion?error=invalid_state si code manquant', async () => {
    const req = makeRequest(
      { state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz' },
    )
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('redirige vers invalid_state si state ne correspond pas au cookie', async () => {
    const req = makeRequest(
      { code: 'auth-code', state: 'wrong-state' },
      { oauth_state: 'expected-state', pkce_verifier: 'verifier-xyz' },
    )
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })

  it('redirige vers invalid_state si pkce_verifier absent', async () => {
    const req = makeRequest(
      { code: 'auth-code', state: 'state-abc' },
      { oauth_state: 'state-abc' },
    )
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=invalid_state')
  })
})

describe('GET /auth/callback — erreurs SSO', () => {
  it('redirige vers auth_failed si exchangeCode lève une exception', async () => {
    mockExchangeCode.mockRejectedValue(new Error('token exchange failed'))

    const req = makeRequest(
      { code: 'bad-code', state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz' },
    )
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=auth_failed')
  })

  it('redirige vers no_role et révoque le token si cjs_roles est vide', async () => {
    mockExchangeCode.mockResolvedValue(TOKEN_RESPONSE)
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: [] })

    const req = makeRequest(
      { code: 'code-xyz', state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz' },
    )
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=no_role')
    expect(mockRevokeToken).toHaveBeenCalledWith(TOKEN_RESPONSE.access_token)
  })
})

describe('GET /auth/callback — flux nominal', () => {
  beforeEach(() => {
    mockExchangeCode.mockResolvedValue(TOKEN_RESPONSE)
    mockGetUserInfo.mockResolvedValue(SSO_CLAIMS)
    mockUpsert.mockResolvedValue({ onboardingComplete: false, region: null, commune: null })
  })

  function validRequest(cookies: Record<string, string> = {}): NextRequest {
    return makeRequest(
      { code: 'auth-code', state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz', ...cookies },
    )
  }

  it('échange le code et récupère les infos utilisateur', async () => {
    await GET(validRequest())
    expect(mockExchangeCode).toHaveBeenCalledWith('auth-code', 'verifier-xyz')
    expect(mockGetUserInfo).toHaveBeenCalledWith(TOKEN_RESPONSE.access_token)
  })

  it('upsert l\'utilisateur en base avec les claims SSO', async () => {
    await GET(validRequest())
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { cjsUid: 'uid-abc' },
        update: expect.objectContaining({ nom: 'Diallo', prenom: 'Fatou' }),
        create: expect.objectContaining({ cjsUid: 'uid-abc', email: 'fatou@example.sn' }),
      })
    )
  })

  it('encode la session et pose le cookie', async () => {
    await GET(validRequest())
    expect(mockEncodeSession).toHaveBeenCalled()
    expect(mockSetSessionCookie).toHaveBeenCalledWith(
      expect.anything(),
      'encoded-session-jwt',
      TOKEN_RESPONSE.expires_in,
    )
  })

  it('redirige vers /jeune/onboarding si onboarding non complété', async () => {
    mockUpsert.mockResolvedValue({ onboardingComplete: false, region: null, commune: null })
    const res = await GET(validRequest())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/jeune/onboarding')
  })

  it('redirige vers /jeune/tableau-de-bord si onboarding complété', async () => {
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: 'Dakar', commune: null })
    const res = await GET(validRequest())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/jeune/tableau-de-bord')
  })

  it('redirige vers /admin/tableau-de-bord pour un admin', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['admin'] })
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).toContain('/admin/tableau-de-bord')
  })

  it('redirige vers /recruteur/tableau-de-bord pour un recruteur', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['recruteur'] })
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).toContain('/recruteur/tableau-de-bord')
  })

  it('respecte le cookie auth_return_to si le chemin est local', async () => {
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
    const res = await GET(validRequest({ auth_return_to: '/jeune/profil' }))
    expect(res.headers.get('location')).toContain('/jeune/profil')
  })

  it('ignore auth_return_to si l\'URL n\'est pas locale', async () => {
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
    const res = await GET(validRequest({ auth_return_to: 'https://evil.com/steal' }))
    expect(res.headers.get('location')).not.toContain('evil.com')
  })

  it('supprime les cookies PKCE et state après usage', async () => {
    const res = await GET(validRequest())
    const setCookie = res.headers.get('set-cookie') ?? ''
    expect(setCookie).toMatch(/pkce_verifier=;/)
    expect(setCookie).toMatch(/oauth_state=;/)
  })
})
