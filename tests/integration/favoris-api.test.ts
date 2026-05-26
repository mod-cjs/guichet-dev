/**
 * @jest-environment node
 *
 * Tests d'intégration de l'API favoris d'opportunités (GUIC-20 / GUIC-167) :
 * GET + POST /api/favoris, DELETE /api/favoris/[opportuniteId].
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

const mockOppFindUnique = jest.fn()
const mockFavFindUnique = jest.fn()
const mockFavCreate = jest.fn()
const mockFavFindMany = jest.fn()
const mockFavCount = jest.fn()
const mockFavDeleteMany = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: {
      findUnique: (...a: unknown[]) => mockOppFindUnique(...a),
    },
    opportuniteFavorite: {
      findUnique: (...a: unknown[]) => mockFavFindUnique(...a),
      create: (...a: unknown[]) => mockFavCreate(...a),
      findMany: (...a: unknown[]) => mockFavFindMany(...a),
      count: (...a: unknown[]) => mockFavCount(...a),
      deleteMany: (...a: unknown[]) => mockFavDeleteMany(...a),
    },
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const listRoute = require('@/app/api/favoris/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const itemRoute = require('@/app/api/favoris/[opportuniteId]/route')

const SESSION = { cjsUid: 'uid-1', nom: 'Diallo', prenom: 'Awa' }
const OPP_ID = '11111111-1111-4111-8111-111111111111'

const CARD = {
  id: OPP_ID,
  slug: 'stage-agri',
  titre: 'Stage agri',
  type: 'Stage',
  domaine: 'Agriculture',
  region: 'Dakar',
  organisation: 'CJS',
  remuneration: null,
  deadline: new Date('2026-12-01T00:00:00.000Z'),
}

function postReq(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/favoris', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}
function getReq(qs = ''): NextRequest {
  return new NextRequest(`http://localhost/api/favoris${qs}`)
}
function delReq(): NextRequest {
  return new NextRequest('http://localhost/api/favoris/x', { method: 'DELETE' })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
})

describe('POST /api/favoris', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await listRoute.POST(postReq({ opportuniteId: OPP_ID }))
    expect(res.status).toBe(401)
  })

  it('renvoie 400 si opportuniteId n’est pas un uuid', async () => {
    const res = await listRoute.POST(postReq({ opportuniteId: 'pas-un-uuid' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('VALIDATION_ERROR')
  })

  it('renvoie 404 si l’opportunité n’existe pas', async () => {
    mockOppFindUnique.mockResolvedValue(null)
    const res = await listRoute.POST(postReq({ opportuniteId: OPP_ID }))
    expect(res.status).toBe(404)
    expect(mockFavCreate).not.toHaveBeenCalled()
  })

  it('renvoie 201 et crée le favori', async () => {
    mockOppFindUnique.mockResolvedValue({ id: OPP_ID })
    mockFavFindUnique.mockResolvedValue(null)
    mockFavCreate.mockResolvedValue({ cjsUid: 'uid-1', opportuniteId: OPP_ID, createdAt: new Date() })
    const res = await listRoute.POST(postReq({ opportuniteId: OPP_ID }))
    expect(res.status).toBe(201)
    expect(mockFavCreate).toHaveBeenCalled()
  })

  it('est idempotent : renvoie 200 sans recréer si le favori existe déjà', async () => {
    mockOppFindUnique.mockResolvedValue({ id: OPP_ID })
    mockFavFindUnique.mockResolvedValue({ cjsUid: 'uid-1', opportuniteId: OPP_ID, createdAt: new Date() })
    const res = await listRoute.POST(postReq({ opportuniteId: OPP_ID }))
    expect(res.status).toBe(200)
    expect(mockFavCreate).not.toHaveBeenCalled()
  })
})

describe('GET /api/favoris', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await listRoute.GET(getReq())
    expect(res.status).toBe(401)
  })

  it('renvoie les favoris de l’utilisateur connecté en items de carte', async () => {
    mockFavFindMany.mockResolvedValue([{ opportunite: CARD }])
    mockFavCount.mockResolvedValue(1)
    const res = await listRoute.GET(getReq())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toEqual([
      {
        id: OPP_ID,
        slug: 'stage-agri',
        titre: 'Stage agri',
        type: 'Stage',
        domaine: 'Agriculture',
        region: 'Dakar',
        organisation: 'CJS',
        remuneration: null,
        deadline: '2026-12-01T00:00:00.000Z',
      },
    ])
    expect(body.meta).toEqual({ total: 1, page: 1, limit: 20 })

    expect(mockFavFindMany.mock.calls[0][0].where).toEqual({ cjsUid: 'uid-1' })
  })
})

describe('DELETE /api/favoris/[opportuniteId]', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await itemRoute.DELETE(delReq(), { params: Promise.resolve({ opportuniteId: OPP_ID }) })
    expect(res.status).toBe(401)
  })

  it('supprime le favori de l’utilisateur et renvoie 204', async () => {
    mockFavDeleteMany.mockResolvedValue({ count: 1 })
    const res = await itemRoute.DELETE(delReq(), { params: Promise.resolve({ opportuniteId: OPP_ID }) })
    expect(res.status).toBe(204)
    expect(mockFavDeleteMany).toHaveBeenCalledWith({
      where: { cjsUid: 'uid-1', opportuniteId: OPP_ID },
    })
  })

  it('est idempotent : renvoie 204 même si aucun favori à supprimer', async () => {
    mockFavDeleteMany.mockResolvedValue({ count: 0 })
    const res = await itemRoute.DELETE(delReq(), { params: Promise.resolve({ opportuniteId: OPP_ID }) })
    expect(res.status).toBe(204)
  })
})
