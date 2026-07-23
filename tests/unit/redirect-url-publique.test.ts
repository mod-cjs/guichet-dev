/**
 * @jest-environment node
 *
 * GUIC-657 — Les redirections doivent viser l'URL PUBLIQUE (NEXTAUTH_URL),
 * jamais `request.url` qui, derrière le reverse proxy Plesk, porte l'adresse
 * interne du conteneur (`http://0.0.0.0:3000`).
 *
 * Bug rapporté : la déconnexion renvoyait sur `0.0.0.0/auth/deconnexion`.
 * Même classe que GUIC-644 (déjà corrigé sur le callback), restée latente dans
 * `logout/route.ts`, `middleware.ts` et les routes whatsapp.
 */

// ── Mocks (évitent d'ouvrir prisma/redis à l'import des modules testés) ──────
const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession:       (...a: unknown[]) => mockGetSession(...a),
  encodeSession:    jest.fn(),
  setSessionCookie: jest.fn(),
  clearSessionCookie: jest.fn(),
}))
jest.mock('@/lib/session-store', () => ({
  isSessionActive: jest.fn().mockResolvedValue(true),
  revokeSession:   jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/sso-client', () => ({ revokeToken: jest.fn().mockResolvedValue(undefined) }))
jest.mock('@/lib/token-store', () => ({
  saveTokens:  jest.fn().mockResolvedValue(undefined),
  getTokens:   jest.fn().mockResolvedValue(null),
  clearTokens: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  hashId: (s: string) => s,
}))

import { NextRequest } from 'next/server'
import { basePublique } from '@/lib/security/base-publique'
import { GET as logoutGET } from '@/app/api/auth/logout/route'
import { middleware } from '@/middleware'

const PUBLIC = 'https://devguichet.consortiumjeunesse.org'
const OLD_ENV = process.env.NEXTAUTH_URL

/** Requête telle que la voit le conteneur derrière le proxy : hôte interne 0.0.0.0. */
const proxied = (path: string) => new NextRequest(`http://0.0.0.0:3000${path}`)

beforeEach(() => {
  jest.clearAllMocks()
  process.env.NEXTAUTH_URL = PUBLIC
})
afterAll(() => { process.env.NEXTAUTH_URL = OLD_ENV })

describe('basePublique (helper partagé)', () => {
  it('retourne NEXTAUTH_URL quand défini (request.url interne ignoré)', () => {
    expect(basePublique(proxied('/api/auth/logout'))).toBe(PUBLIC)
  })

  it('retombe sur l’origine de request.url si NEXTAUTH_URL absent', () => {
    delete process.env.NEXTAUTH_URL
    expect(basePublique(new NextRequest('http://localhost:3000/x'))).toBe('http://localhost:3000')
  })
})

describe('déconnexion (logout GET) derrière proxy — bug rapporté', () => {
  it('redirige vers /auth/deconnexion sur l’URL publique, pas 0.0.0.0', async () => {
    const res = await logoutGET(proxied('/api/auth/logout'))
    const loc = res.headers.get('location')!
    expect(loc).not.toContain('0.0.0.0')
    expect(loc).toBe(`${PUBLIC}/auth/deconnexion`)
  })
})

describe('middleware (non connecté) derrière proxy', () => {
  it('redirige vers /auth/connexion sur l’URL publique, pas 0.0.0.0', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await middleware(proxied('/admin/tableau-de-bord'))
    const loc = res.headers.get('location')!
    expect(loc).not.toContain('0.0.0.0')
    expect(new URL(loc).host).toBe('devguichet.consortiumjeunesse.org')
  })
})
