/**
 * @jest-environment node
 *
 * Tests d'intégration de `GET /api/profil/cv` (GUIC-223).
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

const mockProfilFindUnique = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: { findUnique: (...a: unknown[]) => mockProfilFindUnique(...a) },
  },
}))

jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn().mockResolvedValue(null) }))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/profil/cv/route')

const SESSION = { cjsUid: 'uid-cv-1' }

function getReq(): NextRequest {
  return new NextRequest('http://localhost/api/profil/cv')
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
})

describe('GET /api/profil/cv', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await route.GET(getReq())
    expect(res.status).toBe(401)
  })

  it('renvoie cvUrl + uploadedAt quand le profil a un CV', async () => {
    const uploaded = new Date('2026-05-20T10:00:00Z')
    mockProfilFindUnique.mockResolvedValue({
      cvUrl: 'https://cdn.example.test/cv/uid-cv-1.pdf',
      cvUploadedAt: uploaded,
    })
    const res = await route.GET(getReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.cvUrl).toBe('https://cdn.example.test/cv/uid-cv-1.pdf')
    expect(json.data.uploadedAt).toBe(uploaded.toISOString())
    expect(json.data.name).toBe('')
  })

  it('renvoie cvUrl=null quand le profil n’a pas de CV', async () => {
    mockProfilFindUnique.mockResolvedValue({ cvUrl: null, cvUploadedAt: null })
    const res = await route.GET(getReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual({ cvUrl: null, name: '', uploadedAt: null })
  })

  it('renvoie cvUrl=null si le profil n’existe pas encore', async () => {
    mockProfilFindUnique.mockResolvedValue(null)
    const res = await route.GET(getReq())
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data).toEqual({ cvUrl: null, name: '', uploadedAt: null })
  })
})
