/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { middleware } from '@/middleware'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetSession       = jest.fn()
const mockEncodeSession    = jest.fn()
const mockSetSessionCookie = jest.fn()

jest.mock('@/lib/auth', () => ({
  getSession:       (...args: unknown[]) => mockGetSession(...args),
  encodeSession:    (...args: unknown[]) => mockEncodeSession(...args),
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}))

const mockIsSessionActive = jest.fn()
const mockRevokeToken     = jest.fn()

jest.mock('@/lib/session-store', () => ({
  isSessionActive: (...args: unknown[]) => mockIsSessionActive(...args),
}))

jest.mock('@/lib/sso-client', () => ({
  revokeToken: (...args: unknown[]) => mockRevokeToken(...args),
}))

jest.mock('@/lib/token-store', () => ({
  saveTokens:  jest.fn().mockResolvedValue(undefined),
  getTokens:   jest.fn().mockResolvedValue(null),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}))

// ── Helpers ────────────────────────────────────────────────────────────────

function makeRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`)
}

function makeSession(overrides = {}) {
  const now = Math.floor(Date.now() / 1000)
  return {
    cjsUid:             'uid-123',
    nom:                'Diallo',
    prenom:             'Fatou',
    email:              'fatou@example.sn',
    telephone:          null,
    region:             null,
    roles:              ['beneficiaire'],
    accessToken:        'access-tok',
    refreshToken:       'refresh-tok',
    expiresAt:          now + 3600,
    onboardingComplete: true,
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  mockIsSessionActive.mockResolvedValue(true) // actif par défaut
  mockRevokeToken.mockResolvedValue(undefined)
})

// ── Routes non-protégées ───────────────────────────────────────────────────

describe('routes non-protégées', () => {
  it('laisse passer /opportunites', async () => {
    const res = await middleware(makeRequest('/opportunites'))
    expect(res.status).not.toBe(302)
  })

  it('laisse passer /auth/connexion', async () => {
    const res = await middleware(makeRequest('/auth/connexion'))
    expect(res.status).not.toBe(302)
  })

  it('laisse passer /', async () => {
    const res = await middleware(makeRequest('/'))
    expect(res.status).not.toBe(302)
  })
})

// ── Session absente ────────────────────────────────────────────────────────

describe('session absente', () => {
  beforeEach(() => mockGetSession.mockResolvedValue(null))

  it('redirige vers /auth/connexion pour /jeune/tableau-de-bord', async () => {
    const res = await middleware(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/connexion')
  })

  it('pose le cookie auth_return_to avec le chemin', async () => {
    const res = await middleware(makeRequest('/jeune/profil'))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('auth_return_to')
    // La valeur est URL-encodée dans le cookie
    expect(decodeURIComponent(cookie)).toContain('/jeune/profil')
  })

  it('redirige vers /auth/connexion pour /admin/dashboard', async () => {
    const res = await middleware(makeRequest('/admin/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/connexion')
  })
})

// ── Mauvais rôle ──────────────────────────────────────────────────────────

describe('rôle insuffisant', () => {
  it('bénéficiaire → /admin/* redirige vers son dashboard', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['beneficiaire'] }))
    const res = await middleware(makeRequest('/admin/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/jeune/tableau-de-bord')
  })

  it('bénéficiaire → /recruteur/* redirige vers son dashboard', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['beneficiaire'] }))
    const res = await middleware(makeRequest('/recruteur/offres'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/jeune/tableau-de-bord')
  })

  it('conseiller → /admin/* redirige vers son espace /conseiller', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['conseiller'] }))
    const res = await middleware(makeRequest('/admin/tableau-de-bord'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/conseiller')
  })
})

// ── Espace conseiller (GUIC-526) ──────────────────────────────────────────
// Gate middleware = authentification seule : le périmètre fin (rôle SSO OU
// rattachement AgentCentre, décision D2) se joue dans le layout qui, lui,
// peut lire la base.

describe('espace conseiller — gate authentification', () => {
  it('session absente → /conseiller/agenda redirige vers /auth/connexion', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await middleware(makeRequest('/conseiller/agenda'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/connexion')
  })

  it('session authentifiée sans rôle conseiller → passe (le layout arbitre D2)', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['beneficiaire'] }))
    const res = await middleware(makeRequest('/conseiller/agenda'))
    expect(res.status).toBe(200)
  })
})

// ── Force onboarding ──────────────────────────────────────────────────────

describe('onboarding obligatoire', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      makeSession({ roles: ['beneficiaire'], onboardingComplete: false })
    )
  })

  it('redirige vers /jeune/onboarding si non complété', async () => {
    const res = await middleware(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/jeune/onboarding')
  })

  it('ne redirige pas si déjà sur /jeune/onboarding', async () => {
    const res = await middleware(makeRequest('/jeune/onboarding'))
    expect(res.status).not.toBe(307)
  })
})

// ── Accès autorisé ────────────────────────────────────────────────────────

describe('accès autorisé', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      makeSession({ roles: ['beneficiaire'], onboardingComplete: true })
    )
  })

  it('laisse passer /jeune/tableau-de-bord avec session valide', async () => {
    const res = await middleware(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).not.toBe(307)
  })
})

// ── Denylist Redis (backchannel logout) ──────────────────────────────────

describe('denylist Redis', () => {
  it('redirige vers login si session révoquée (backchannel logout)', async () => {
    mockGetSession.mockResolvedValue(makeSession())
    mockIsSessionActive.mockResolvedValue(false) // révoquée

    const res = await middleware(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/connexion')
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('cjs_session=;')
  })

  it('laisse passer si session active en Redis', async () => {
    mockGetSession.mockResolvedValue(makeSession({ onboardingComplete: true }))
    mockIsSessionActive.mockResolvedValue(true)

    const res = await middleware(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).not.toBe(307)
  })

  it('fail-open : Redis indisponible → session considérée active', async () => {
    mockGetSession.mockResolvedValue(makeSession({ onboardingComplete: true }))
    mockIsSessionActive.mockResolvedValue(true) // session-store catch → true

    const res = await middleware(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).not.toBe(307)
  })
})

// ── Rôles admin étendus (moderator, super_admin) ─────────────────────────

describe('rôles admin étendus', () => {
  it('moderator accède à /admin/', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['moderator'] }))
    const res = await middleware(makeRequest('/admin/tableau-de-bord'))
    expect(res.status).not.toBe(307)
  })

  it('super_admin accède à /admin/', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['super_admin'] }))
    const res = await middleware(makeRequest('/admin/utilisateurs'))
    expect(res.status).not.toBe(307)
  })

  it('moderator redirigé vers /admin/ depuis /jeune/ (mauvais espace)', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['moderator'] }))
    const res = await middleware(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/admin/tableau-de-bord')
  })

  it('jeune accède à /jeune/', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['jeune'], onboardingComplete: true }))
    const res = await middleware(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).not.toBe(307)
  })

  it('chercheur_d_emploi accède à /jeune/', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['chercheur_d_emploi'], onboardingComplete: true }))
    const res = await middleware(makeRequest('/jeune/profil'))
    expect(res.status).not.toBe(307)
  })

  it('rôle inconnu → redirige vers /auth/connexion?error=no_role', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['inconnu'] }))
    const res = await middleware(makeRequest('/jeune/tableau-de-bord'))
    expect(res.headers.get('location')).toContain('error=no_role')
  })
})

// ── Refresh automatique ───────────────────────────────────────────────────

describe('refresh de token', () => {
  it('rafraîchit le token si expiration proche (< 5 min)', async () => {
    const now = Math.floor(Date.now() / 1000)
    mockGetSession.mockResolvedValue(
      makeSession({ expiresAt: now + 120, onboardingComplete: true })
    )
    mockEncodeSession.mockResolvedValue('new-encoded-session')

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const res = await middleware(makeRequest('/jeune/profil'))
    expect(fetchSpy).toHaveBeenCalled()
    expect(mockEncodeSession).toHaveBeenCalled()
    expect(mockSetSessionCookie).toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('révoque l\'ancien token après refresh réussi', async () => {
    const now = Math.floor(Date.now() / 1000)
    mockGetSession.mockResolvedValue(
      makeSession({ expiresAt: now + 120, onboardingComplete: true, accessToken: 'old-at' })
    )
    mockEncodeSession.mockResolvedValue('new-encoded-session')

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 }), {
        status: 200, headers: { 'Content-Type': 'application/json' },
      })
    )

    await middleware(makeRequest('/jeune/profil'))

    // Attendre que la révocation fire-and-forget se termine
    await new Promise(r => setTimeout(r, 10))
    expect(mockRevokeToken).toHaveBeenCalledWith('old-at')

    fetchSpy.mockRestore()
  })

  it('redirige vers login si le refresh échoue', async () => {
    const now = Math.floor(Date.now() / 1000)
    mockGetSession.mockResolvedValue(
      makeSession({ expiresAt: now + 120, onboardingComplete: true })
    )

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('error', { status: 401 })
    )

    const res = await middleware(makeRequest('/jeune/profil'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/connexion')
    expect(res.headers.get('set-cookie')).toContain('cjs_session=;')

    fetchSpy.mockRestore()
  })
})
