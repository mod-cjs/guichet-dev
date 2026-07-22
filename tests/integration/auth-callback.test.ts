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

jest.mock('@/lib/token-store', () => ({
  saveTokens:  jest.fn().mockResolvedValue(undefined),
  getTokens:   jest.fn().mockResolvedValue(null),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@/lib/session-store', () => ({
  clearRevocation: jest.fn().mockResolvedValue(undefined),
  revokeSession:   jest.fn().mockResolvedValue(undefined),
  isSessionActive: jest.fn().mockResolvedValue(true),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  hashId: jest.fn((s: string) => 'hash-' + String(s).slice(0, 4)),
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

  // GUIC-526 — le rôle conseiller entre dans le routing post-login.
  it('redirige vers /conseiller pour un conseiller', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['conseiller'] })
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
    const res = await GET(validRequest())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/conseiller')
  })

  // GUIC-526 — cache Utilisateur.role : rôle PRINCIPAL (priorité admin >
  // recruteur > conseiller > bénéficiaire), pas roles[0] positionnel.
  it('cache le rôle principal en base (admin prioritaire sur conseiller)', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['conseiller', 'admin'] })
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
    await GET(validRequest())
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ role: 'admin' }),
      })
    )
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

// ── Cas limites — champs SSO null ─────────────────────────────────────────

describe('GET /auth/callback — champs SSO null ou absents', () => {
  beforeEach(() => {
    mockExchangeCode.mockResolvedValue(TOKEN_RESPONSE)
    mockUpsert.mockResolvedValue({ onboardingComplete: false, region: null, commune: null })
  })

  function validRequest(extraCookies: Record<string, string> = {}): NextRequest {
    return makeRequest(
      { code: 'auth-code', state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz', ...extraCookies },
    )
  }

  it('family_name null → upsert avec nom=""', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, family_name: null })
    await GET(validRequest())
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ nom: '' }),
      })
    )
  })

  it('given_name null → upsert avec prenom=""', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, given_name: null })
    await GET(validRequest())
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ prenom: '' }),
      })
    )
  })

  it('family_name null → session.nom=""  (pas undefined)', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, family_name: null })
    await GET(validRequest())
    const sessionArg = mockEncodeSession.mock.calls[0]?.[0]
    expect(sessionArg?.nom).toBe('')
  })

  it('given_name null → session.prenom="" (pas undefined)', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, given_name: null })
    await GET(validRequest())
    const sessionArg = mockEncodeSession.mock.calls[0]?.[0]
    expect(sessionArg?.prenom).toBe('')
  })

  it('email null → upsert sans email (undefined)', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, email: null })
    await GET(validRequest())
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ email: undefined }),
      })
    )
  })

  it('family_name existant → update avec nom=undefined (ne pas écraser)', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, family_name: null })
    await GET(validRequest())
    expect(mockUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ nom: undefined }),
      })
    )
  })

  it('cjs_roles comme string CSV → parsé correctement', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: 'beneficiaire,jeune' as unknown as string[] })
    const res = await GET(validRequest())
    // Doit procéder normalement — bénéficiaire reconnu
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/jeune/onboarding')
    expect(mockRevokeToken).not.toHaveBeenCalled()
  })

  it('Prisma upsert échoue → revoke token et redirige vers auth_failed', async () => {
    mockGetUserInfo.mockResolvedValue(SSO_CLAIMS)
    mockUpsert.mockRejectedValue(new Error('Unique constraint failed'))
    const res = await GET(validRequest())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=auth_failed')
    expect(mockRevokeToken).toHaveBeenCalledWith(TOKEN_RESPONSE.access_token)
  })
})

// ── Vérification du statut de compte ─────────────────────────────────────

describe('GET /auth/callback — cjs_status', () => {
  beforeEach(() => {
    mockExchangeCode.mockResolvedValue(TOKEN_RESPONSE)
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
  })

  function validRequest(): NextRequest {
    return makeRequest(
      { code: 'auth-code', state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz' },
    )
  }

  it('accepte un compte active', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_status: 'active' })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).not.toContain('account_inactive')
    expect(mockRevokeToken).not.toHaveBeenCalled()
  })

  it('rejette un compte inactive → error=account_inactive', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_status: 'inactive' })
    const res = await GET(validRequest())
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('error=account_inactive')
    expect(mockRevokeToken).toHaveBeenCalledWith(TOKEN_RESPONSE.access_token)
  })

  it('rejette un compte suspended → error=account_inactive', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_status: 'suspended' })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).toContain('error=account_inactive')
    expect(mockRevokeToken).toHaveBeenCalledWith(TOKEN_RESPONSE.access_token)
  })

  it('accepte si cjs_status absent (compte non-migré)', async () => {
    const claimsWithoutStatus = { ...SSO_CLAIMS }
    delete (claimsWithoutStatus as Record<string, unknown>).cjs_status
    mockGetUserInfo.mockResolvedValue(claimsWithoutStatus)
    const res = await GET(validRequest())
    expect(res.headers.get('location')).not.toContain('account_inactive')
  })
})

// ── Routing par rôle — cas complets ──────────────────────────────────────

describe('GET /auth/callback — roleRedirect complet', () => {
  beforeEach(() => {
    mockExchangeCode.mockResolvedValue(TOKEN_RESPONSE)
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
  })

  function validRequest(): NextRequest {
    return makeRequest(
      { code: 'auth-code', state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz' },
    )
  }

  it('moderator → /admin/tableau-de-bord', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['moderator'] })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).toContain('/admin/tableau-de-bord')
  })

  it('super_admin → /admin/tableau-de-bord', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['super_admin'] })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).toContain('/admin/tableau-de-bord')
  })

  it('admin + beneficiaire → /admin/ (admin prioritaire)', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['admin', 'beneficiaire'] })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).toContain('/admin/tableau-de-bord')
  })

  it('jeune → /jeune/tableau-de-bord (BENEFICIAIRE_ROLES)', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['jeune'] })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).toContain('/jeune/tableau-de-bord')
  })

  it('chercheur_d_emploi → /jeune/tableau-de-bord', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['chercheur_d_emploi'] })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).toContain('/jeune/tableau-de-bord')
  })

  it('rôle inconnu → error=no_role (pas de révocation — token valide mais rôle non géré)', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['unknown_role'] })
    const res = await GET(validRequest())
    expect(res.headers.get('location')).toContain('error=no_role')
    // Le token n'est PAS révoqué : l'utilisateur est authentifié côté SSO,
    // il n'a simplement pas de rôle reconnu par le Guichet.
    expect(mockRevokeToken).not.toHaveBeenCalled()
  })

  it('bénéficiaire non-onboardé avec returnTo → ignoré, redirige onboarding', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['beneficiaire'] })
    mockUpsert.mockResolvedValue({ onboardingComplete: false, region: null, commune: null })
    const res = await GET(makeRequest(
      { code: 'auth-code', state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz', auth_return_to: '/jeune/profil' },
    ))
    expect(res.headers.get('location')).toContain('/jeune/onboarding')
    expect(res.headers.get('location')).not.toContain('/jeune/profil')
  })
})

// ── Normalisation E.164 du téléphone ─────────────────────────────────────

describe('GET /auth/callback — E.164 téléphone', () => {
  beforeEach(() => {
    mockExchangeCode.mockResolvedValue(TOKEN_RESPONSE)
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
  })

  function validRequest(): NextRequest {
    return makeRequest(
      { code: 'auth-code', state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz' },
    )
  }

  it('numéro déjà E.164 (+221…) → conservé tel quel', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, phone_number: '+221771234567' })
    await GET(validRequest())
    const session = mockEncodeSession.mock.calls[0]?.[0]
    expect(session.telephone).toBe('+221771234567')
  })

  it('numéro local 9 chiffres → +221 ajouté', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, phone_number: '771234567' })
    await GET(validRequest())
    const session = mockEncodeSession.mock.calls[0]?.[0]
    expect(session.telephone).toBe('+221771234567')
  })

  it('numéro format 00221… → +221…', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, phone_number: '00221771234567' })
    await GET(validRequest())
    const session = mockEncodeSession.mock.calls[0]?.[0]
    expect(session.telephone).toBe('+221771234567')
  })

  it('phone_number null → telephone null dans la session', async () => {
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, phone_number: null })
    await GET(validRequest())
    const session = mockEncodeSession.mock.calls[0]?.[0]
    expect(session.telephone).toBeNull()
  })
})

// ── safeReturnTo ──────────────────────────────────────────────────────────

describe('GET /auth/callback — safeReturnTo', () => {
  beforeEach(() => {
    mockExchangeCode.mockResolvedValue(TOKEN_RESPONSE)
    mockGetUserInfo.mockResolvedValue({ ...SSO_CLAIMS, cjs_roles: ['admin'] })
    mockUpsert.mockResolvedValue({ onboardingComplete: true, region: null, commune: null })
  })

  function withReturnTo(path: string): NextRequest {
    return makeRequest(
      { code: 'auth-code', state: 'state-abc' },
      { oauth_state: 'state-abc', pkce_verifier: 'verifier-xyz', auth_return_to: path },
    )
  }

  it('utilise auth_return_to si chemin local valide', async () => {
    const res = await GET(withReturnTo('/admin/utilisateurs'))
    expect(res.headers.get('location')).toContain('/admin/utilisateurs')
  })

  it('ignore auth_return_to avec domaine externe', async () => {
    const res = await GET(withReturnTo('https://evil.com/steal'))
    expect(res.headers.get('location')).not.toContain('evil.com')
  })

  it('ignore auth_return_to avec protocole javascript:', async () => {
    const res = await GET(withReturnTo('javascript:alert(1)'))
    expect(res.headers.get('location')).not.toContain('javascript')
  })
})

describe('GUIC-644 — redirections basées sur l’URL publique, pas sur request.url (proxy)', () => {
  /**
   * Simule le déploiement réel : Plesk → conteneur. La requête ARRIVE avec l'hôte INTERNE
   * (`0.0.0.0:3000`, le HOSTNAME du conteneur), mais l'origine PUBLIQUE est NEXTAUTH_URL.
   * Avant GUIC-644, `new URL(dest, request.url)` renvoyait vers `https://0.0.0.0:3000/...`
   * (ERR_SSL_PROTOCOL_ERROR après login). Après : vers le domaine public.
   */
  function requeteDerriereProxy(params: Record<string, string>, cookies: Record<string, string>): NextRequest {
    const url = new URL('http://0.0.0.0:3000/auth/callback') // ← hôte interne du conteneur
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
    const req = new NextRequest(url.toString())
    Object.entries(cookies).forEach(([n, v]) => req.cookies.set(n, v))
    return req
  }

  const PUBLIC = 'https://devguichet.consortiumjeunessesenegal.org'

  beforeEach(() => {
    process.env.NEXTAUTH_URL = PUBLIC
  })
  afterEach(() => {
    process.env.NEXTAUTH_URL = 'http://localhost:3000'
  })

  it('erreur invalid_state : redirige vers l’URL PUBLIQUE, jamais 0.0.0.0', async () => {
    const res = await GET(requeteDerriereProxy({}, {}))
    const loc = res.headers.get('location') ?? ''
    expect(loc).toContain(PUBLIC)
    expect(loc).not.toContain('0.0.0.0')
  })

  it('la redirection finale de succès vise l’URL publique', async () => {
    const res = await GET(
      requeteDerriereProxy(
        { code: 'valid-code', state: 'stateXYZ' },
        { oauth_state: 'stateXYZ', pkce_verifier: 'verifier' },
      ),
    )
    const loc = res.headers.get('location') ?? ''
    // Redirection vers l'app (onboarding ou tableau de bord) — sur le domaine public.
    expect(loc).toContain(PUBLIC)
    expect(loc).not.toContain('0.0.0.0')
  })
})
