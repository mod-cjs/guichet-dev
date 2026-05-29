/**
 * @jest-environment node
 *
 * Tests d'intégration de /api/onboarding/draft (GET / PATCH / DELETE).
 * Prisma, auth et rate-limit sont mockés. (GUIC-181)
 */

import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetSession = jest.fn()

jest.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

const mockFindUnique = jest.fn()
const mockUpsert     = jest.fn()
const mockDelete     = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    onboardingDraft: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      upsert:     (...args: unknown[]) => mockUpsert(...args),
      delete:     (...args: unknown[]) => mockDelete(...args),
    },
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// Import après mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET, PATCH, DELETE } = require('@/app/api/onboarding/draft/route')

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(method: 'GET' | 'PATCH' | 'DELETE', body?: unknown): NextRequest {
  const init: { method: string; headers?: Record<string, string>; body?: string } = { method }
  if (body !== undefined) {
    init.headers = { 'Content-Type': 'application/json' }
    init.body = JSON.stringify(body)
  }
  return new NextRequest('http://localhost:3000/api/onboarding/draft', init)
}

const SESSION = {
  cjsUid: 'uid-test',
  nom: 'Diallo', prenom: 'Fatou',
  email: 'fatou@example.sn', telephone: null, region: null,
  roles: ['beneficiaire'], accessToken: 'a', refreshToken: 'r',
  expiresAt: Math.floor(Date.now() / 1000) + 3600,
  onboardingComplete: false,
}

beforeEach(() => {
  jest.clearAllMocks()
})

// ── GET ────────────────────────────────────────────────────────────────────

describe('GET /api/onboarding/draft', () => {
  it('401 si non authentifié', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(401)
  })

  it('retourne null si aucun draft', async () => {
    mockGetSession.mockResolvedValueOnce(SESSION)
    mockFindUnique.mockResolvedValueOnce(null)
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toBeNull()
  })

  it('retourne le draft existant', async () => {
    mockGetSession.mockResolvedValueOnce(SESSION)
    mockFindUnique.mockResolvedValueOnce({
      cjsUid: 'uid-test',
      objectifs: ['emploi', 'projet'],
      telephone: null,
      prenom: 'Fatou', nom: 'Diallo',
      dateNaissance: new Date('2000-01-15'),
      genre: 'F', region: 'Dakar', commune: null,
      updatedAt: new Date(),
    })
    const res = await GET(makeReq('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.objectifs).toEqual(['emploi', 'projet'])
    expect(body.data.prenom).toBe('Fatou')
    expect(body.data.dateNaissance).toBe('2000-01-15')
  })
})

// ── PATCH ──────────────────────────────────────────────────────────────────

describe('PATCH /api/onboarding/draft', () => {
  it('401 si non authentifié', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const res = await PATCH(makeReq('PATCH', { prenom: 'X' }))
    expect(res.status).toBe(401)
  })

  it('422 si body invalide', async () => {
    mockGetSession.mockResolvedValueOnce(SESSION)
    const res = await PATCH(makeReq('PATCH', { objectifs: 'pas-un-tableau' }))
    expect(res.status).toBe(422)
  })

  it('upsert avec champs partiels', async () => {
    mockGetSession.mockResolvedValueOnce(SESSION)
    mockUpsert.mockResolvedValueOnce({
      cjsUid: 'uid-test',
      objectifs: ['emploi'],
      telephone: null, prenom: null, nom: null, dateNaissance: null,
      genre: null, region: null, commune: null,
      updatedAt: new Date(),
    })
    const res = await PATCH(makeReq('PATCH', { objectifs: ['emploi'] }))
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { cjsUid: 'uid-test' },
      update: expect.objectContaining({ objectifs: ['emploi'] }),
      create: expect.objectContaining({ cjsUid: 'uid-test', objectifs: ['emploi'] }),
    }))
  })

  it('accepte un body vide (no-op merge)', async () => {
    mockGetSession.mockResolvedValueOnce(SESSION)
    mockUpsert.mockResolvedValueOnce({
      cjsUid: 'uid-test',
      objectifs: null, telephone: null, prenom: null, nom: null,
      dateNaissance: null, genre: null, region: null, commune: null,
      updatedAt: new Date(),
    })
    const res = await PATCH(makeReq('PATCH', {}))
    expect(res.status).toBe(200)
  })

  it('400 si JSON invalide', async () => {
    mockGetSession.mockResolvedValueOnce(SESSION)
    const req = new NextRequest('http://localhost:3000/api/onboarding/draft', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: 'not-json',
    })
    const res = await PATCH(req)
    expect(res.status).toBe(400)
  })
})

// ── DELETE ─────────────────────────────────────────────────────────────────

describe('DELETE /api/onboarding/draft', () => {
  it('401 si non authentifié', async () => {
    mockGetSession.mockResolvedValueOnce(null)
    const res = await DELETE(makeReq('DELETE'))
    expect(res.status).toBe(401)
  })

  it('supprime le draft (204)', async () => {
    mockGetSession.mockResolvedValueOnce(SESSION)
    mockDelete.mockResolvedValueOnce({})
    const res = await DELETE(makeReq('DELETE'))
    expect(res.status).toBe(204)
    expect(mockDelete).toHaveBeenCalledWith({ where: { cjsUid: 'uid-test' } })
  })

  it('idempotent : 204 même si draft absent (P2025)', async () => {
    mockGetSession.mockResolvedValueOnce(SESSION)
    mockDelete.mockRejectedValueOnce(Object.assign(new Error('Not found'), { code: 'P2025' }))
    const res = await DELETE(makeReq('DELETE'))
    expect(res.status).toBe(204)
  })
})
