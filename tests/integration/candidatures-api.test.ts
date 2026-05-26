/**
 * @jest-environment node
 *
 * Tests d'intégration de `POST` et `GET /api/candidatures` (GUIC-21).
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

const mockOppFindUnique = jest.fn()
const mockCandCreate = jest.fn()
const mockCandFindMany = jest.fn()
const mockCandCount = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: { findUnique: (...a: unknown[]) => mockOppFindUnique(...a) },
    candidature: {
      create: (...a: unknown[]) => mockCandCreate(...a),
      findMany: (...a: unknown[]) => mockCandFindMany(...a),
      count: (...a: unknown[]) => mockCandCount(...a),
    },
  },
}))

jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn().mockResolvedValue(null) }))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() } }))

const mockNotify = jest.fn()
jest.mock('@/lib/notifications', () => ({
  notifyCandidatureConfirmee: (...a: unknown[]) => mockNotify(...a),
}))

// `after` exécuté inline pour observer le dispatch des notifications.
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return { ...actual, after: (cb: () => unknown) => cb() }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/candidatures/route')

const SESSION = { cjsUid: 'uid-1', prenom: 'Awa', telephone: '+221770000000' }
const OPP_ID = '11111111-1111-4111-8111-111111111111'
const OPP = {
  id: OPP_ID,
  slug: 'stage-agri',
  titre: 'Stage agri',
  organisation: 'CJS',
  statut: 'publiee',
  deletedAt: null,
  deadline: new Date(Date.now() + 30 * 86_400_000),
}

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/candidatures', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
const getReq = () => new NextRequest('http://localhost/api/candidatures')

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
  mockOppFindUnique.mockResolvedValue(OPP)
  mockCandCreate.mockResolvedValue({ id: 'c1', cjsUid: 'uid-1', opportuniteId: OPP_ID })
})

describe('POST /api/candidatures', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    expect((await route.POST(postReq({ opportuniteId: OPP_ID }))).status).toBe(401)
  })

  it('renvoie 400 si le body est invalide', async () => {
    const res = await route.POST(postReq({ opportuniteId: 'x', lettreMotivation: 5 }))
    expect(res.status).toBe(400)
  })

  it('renvoie 404 si l’opportunité n’existe pas', async () => {
    mockOppFindUnique.mockResolvedValue(null)
    expect((await route.POST(postReq({ opportuniteId: OPP_ID }))).status).toBe(404)
  })

  it('renvoie 422 si l’opportunité n’est pas publiée', async () => {
    mockOppFindUnique.mockResolvedValue({ ...OPP, statut: 'brouillon' })
    expect((await route.POST(postReq({ opportuniteId: OPP_ID }))).status).toBe(422)
  })

  it('renvoie 422 si l’opportunité est expirée', async () => {
    mockOppFindUnique.mockResolvedValue({ ...OPP, deadline: new Date(Date.now() - 86_400_000) })
    expect((await route.POST(postReq({ opportuniteId: OPP_ID }))).status).toBe(422)
  })

  it('renvoie 201, crée la candidature et déclenche les notifications', async () => {
    const res = await route.POST(
      postReq({ opportuniteId: OPP_ID, lettreMotivation: 'Motivée', notificationsConsent: true }),
    )
    expect(res.status).toBe(201)
    expect(mockCandCreate).toHaveBeenCalled()
    expect(mockNotify).toHaveBeenCalledTimes(1)
    expect(mockNotify.mock.calls[0][1]).toBe(true) // consentement transmis
  })

  it('renvoie 409 si l’utilisateur a déjà candidaté', async () => {
    mockCandCreate.mockRejectedValue({ code: 'P2002' })
    const res = await route.POST(postReq({ opportuniteId: OPP_ID }))
    expect(res.status).toBe(409)
    expect((await res.json()).error.code).toBe('ALREADY_APPLIED')
  })
})

describe('GET /api/candidatures', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    expect((await route.GET(getReq())).status).toBe(401)
  })

  it('renvoie les candidatures de l’utilisateur connecté', async () => {
    mockCandFindMany.mockResolvedValue([
      {
        id: 'c1',
        statut: 'En_attente',
        soumiseA: new Date('2026-05-01T00:00:00.000Z'),
        opportunite: { slug: 'stage-agri', titre: 'Stage agri', organisation: 'CJS' },
      },
    ])
    mockCandCount.mockResolvedValue(1)
    const res = await route.GET(getReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data[0]).toEqual({
      id: 'c1',
      opportuniteSlug: 'stage-agri',
      opportuniteTitre: 'Stage agri',
      organisation: 'CJS',
      statut: 'En_attente',
      soumiseA: '2026-05-01T00:00:00.000Z',
    })
    expect(body.meta).toEqual({ total: 1, page: 1, limit: 20 })
    expect(mockCandFindMany.mock.calls[0][0].where).toEqual({ cjsUid: 'uid-1' })
  })
})
