/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { proxy } from '@/proxy'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetSession     = jest.fn()
const mockIsSessionActive = jest.fn()
const mockEncodeSession  = jest.fn()
const mockSetSessionCookie = jest.fn()

jest.mock('@/lib/auth', () => ({
  getSession:       (...args: unknown[]) => mockGetSession(...args),
  encodeSession:    (...args: unknown[]) => mockEncodeSession(...args),
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}))

jest.mock('@/lib/session-store', () => ({
  isSessionActive: (...args: unknown[]) => mockIsSessionActive(...args),
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

beforeEach(() => jest.clearAllMocks())

// ── Routes non-protégées ───────────────────────────────────────────────────

describe('routes non-protégées', () => {
  it('laisse passer /opportunites', async () => {
    const res = await proxy(makeRequest('/opportunites'))
    expect(res.status).not.toBe(302)
  })

  it('laisse passer /auth/connexion', async () => {
    const res = await proxy(makeRequest('/auth/connexion'))
    expect(res.status).not.toBe(302)
  })

  it('laisse passer /', async () => {
    const res = await proxy(makeRequest('/'))
    expect(res.status).not.toBe(302)
  })
})

// ── Session absente ────────────────────────────────────────────────────────

describe('session absente', () => {
  beforeEach(() => mockGetSession.mockResolvedValue(null))

  it('redirige vers /auth/connexion pour /jeune/tableau-de-bord', async () => {
    const res = await proxy(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/connexion')
  })

  it('pose le cookie auth_return_to avec le chemin', async () => {
    const res = await proxy(makeRequest('/jeune/profil'))
    const cookie = res.headers.get('set-cookie') ?? ''
    expect(cookie).toContain('auth_return_to')
    // La valeur est URL-encodée dans le cookie
    expect(decodeURIComponent(cookie)).toContain('/jeune/profil')
  })

  it('redirige vers /auth/connexion pour /admin/dashboard', async () => {
    const res = await proxy(makeRequest('/admin/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/connexion')
  })
})

// ── Session révoquée (Redis) ───────────────────────────────────────────────

describe('session révoquée', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(makeSession())
    mockIsSessionActive.mockResolvedValue(false)
  })

  it('redirige avec error=session_expired et supprime le cookie', async () => {
    const res = await proxy(makeRequest('/jeune/profil'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('session_expired')
    expect(res.headers.get('set-cookie')).toContain('cjs_session=;')
  })
})

// ── Mauvais rôle ──────────────────────────────────────────────────────────

describe('rôle insuffisant', () => {
  beforeEach(() => {
    mockIsSessionActive.mockResolvedValue(true)
  })

  it('bénéficiaire → /admin/* redirige avec error=forbidden', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['beneficiaire'] }))
    const res = await proxy(makeRequest('/admin/dashboard'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('forbidden')
  })

  it('bénéficiaire → /recruteur/* redirige avec error=forbidden', async () => {
    mockGetSession.mockResolvedValue(makeSession({ roles: ['beneficiaire'] }))
    const res = await proxy(makeRequest('/recruteur/offres'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('forbidden')
  })
})

// ── Force onboarding ──────────────────────────────────────────────────────

describe('onboarding obligatoire', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      makeSession({ roles: ['beneficiaire'], onboardingComplete: false })
    )
    mockIsSessionActive.mockResolvedValue(true)
  })

  it('redirige vers /jeune/onboarding si non complété', async () => {
    const res = await proxy(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/jeune/onboarding')
  })

  it('ne redirige pas si déjà sur /jeune/onboarding', async () => {
    const res = await proxy(makeRequest('/jeune/onboarding'))
    expect(res.status).not.toBe(307)
  })
})

// ── Accès autorisé ────────────────────────────────────────────────────────

describe('accès autorisé', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(
      makeSession({ roles: ['beneficiaire'], onboardingComplete: true })
    )
    mockIsSessionActive.mockResolvedValue(true)
  })

  it('laisse passer /jeune/tableau-de-bord avec session valide', async () => {
    const res = await proxy(makeRequest('/jeune/tableau-de-bord'))
    expect(res.status).not.toBe(307)
  })
})

// ── Refresh automatique ───────────────────────────────────────────────────

describe('refresh de token', () => {
  it('rafraîchit le token si expiration proche (< 5 min)', async () => {
    const now = Math.floor(Date.now() / 1000)
    mockGetSession.mockResolvedValue(
      makeSession({ expiresAt: now + 120, onboardingComplete: true })
    )
    mockIsSessionActive.mockResolvedValue(true)
    mockEncodeSession.mockResolvedValue('new-encoded-session')

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ access_token: 'new-at', refresh_token: 'new-rt', expires_in: 3600 }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      })
    )

    const res = await proxy(makeRequest('/jeune/profil'))
    expect(fetchSpy).toHaveBeenCalled()
    expect(mockEncodeSession).toHaveBeenCalled()
    expect(mockSetSessionCookie).toHaveBeenCalled()

    fetchSpy.mockRestore()
  })

  it('redirige vers login si le refresh échoue', async () => {
    const now = Math.floor(Date.now() / 1000)
    mockGetSession.mockResolvedValue(
      makeSession({ expiresAt: now + 120, onboardingComplete: true })
    )
    mockIsSessionActive.mockResolvedValue(true)

    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response('error', { status: 401 })
    )

    const res = await proxy(makeRequest('/jeune/profil'))
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/auth/connexion')
    expect(res.headers.get('set-cookie')).toContain('cjs_session=;')

    fetchSpy.mockRestore()
  })
})
