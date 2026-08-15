/**
 * @jest-environment node
 *
 * Tests d'intégration de GET /api/profil/activity.
 * Auth, rate-limit et dashboard-loader sont mockés.
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

const mockLoadRecentActivity = jest.fn()
jest.mock('@/lib/dashboard-loader', () => ({
  loadRecentActivity: (...args: unknown[]) => mockLoadRecentActivity(...args),
  ACTIVITY_LIMIT_DEFAULT: 10,
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET } = require('@/app/api/profil/activity/route')

const SESSION = {
  cjsUid:             'uid-abc',
  nom:                'Diallo',
  prenom:             'Fatou',
  email:              null,
  telephone:          null,
  region:             null,
  roles:              ['beneficiaire'],
  accessToken:        'tok',
  refreshToken:       'rtok',
  expiresAt:          Math.floor(Date.now() / 1000) + 3600,
  onboardingComplete: true,
}

function req(url: string): NextRequest {
  return new NextRequest(url)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockLoadRecentActivity.mockResolvedValue([])
})

describe('GET /api/profil/activity', () => {
  it('retourne 401 sans session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await GET(req('http://localhost/api/profil/activity'))
    expect(res.status).toBe(401)
  })

  it('appelle loadRecentActivity avec le limit par défaut (10) sans param', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    await GET(req('http://localhost/api/profil/activity'))
    expect(mockLoadRecentActivity).toHaveBeenCalledWith('uid-abc', 10, ['beneficiaire'])
  })

  it('parse et transmet ?limit=5', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    await GET(req('http://localhost/api/profil/activity?limit=5'))
    expect(mockLoadRecentActivity).toHaveBeenCalledWith('uid-abc', 5, ['beneficiaire'])
  })

  it('ignore un limit non-numérique et utilise le défaut', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    await GET(req('http://localhost/api/profil/activity?limit=abc'))
    expect(mockLoadRecentActivity).toHaveBeenCalledWith('uid-abc', 10, ['beneficiaire'])
  })

  it('retourne les items dans data.items', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockLoadRecentActivity.mockResolvedValue([
      { type: 'candidature', id: 'c1', date: '2026-05-10T10:00:00.000Z', opportuniteTitre: 'Stage', statut: 'Vue' },
    ])
    const res = await GET(req('http://localhost/api/profil/activity'))
    const body = await res.json()
    expect(res.status).toBe(200)
    expect(body.data.items).toHaveLength(1)
    expect(body.data.items[0].type).toBe('candidature')
  })
})
