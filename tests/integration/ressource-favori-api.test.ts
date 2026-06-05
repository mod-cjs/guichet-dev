/**
 * @jest-environment node
 *
 * Tests d'intégration de l'API favoris de ressources (GUIC-24) :
 *  - POST /api/ressources/[id]/favori (toggle)
 *  - GET  /api/favoris/ressources
 *  - GET  /api/favoris/ressources/ids
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

const mockResFindUnique = jest.fn()
const mockFavFindUnique = jest.fn()
const mockFavCreate = jest.fn()
const mockFavDelete = jest.fn()
const mockFavFindMany = jest.fn()
const mockFavCount = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    ressource: {
      findUnique: (...a: unknown[]) => mockResFindUnique(...a),
    },
    ressourceFavorite: {
      findUnique: (...a: unknown[]) => mockFavFindUnique(...a),
      create: (...a: unknown[]) => mockFavCreate(...a),
      delete: (...a: unknown[]) => mockFavDelete(...a),
      findMany: (...a: unknown[]) => mockFavFindMany(...a),
      count: (...a: unknown[]) => mockFavCount(...a),
    },
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const toggleRoute = require('@/app/api/ressources/[id]/favori/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const listRoute = require('@/app/api/favoris/ressources/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const idsRoute = require('@/app/api/favoris/ressources/ids/route')

const SESSION = { cjsUid: 'uid-1', nom: 'Diop', prenom: 'Mariam' }
const RES_ID = '22222222-2222-4222-8222-222222222222'

const RESSOURCE = {
  id: RES_ID,
  titre: 'Guide entrepreneuriat',
  description: 'Lance ton activité',
  type: 'Guide',
  theme: 'Entrepreneuriat',
  url: 'https://example.org/guide.pdf',
  vues: 12,
  niveau: 'Debutant',
  langue: 'FR',
  categorie: 'Business',
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
}

function postReq(): NextRequest {
  return new NextRequest(`http://localhost/api/ressources/${RES_ID}/favori`, {
    method: 'POST',
  })
}
function getReq(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
})

describe('POST /api/ressources/[id]/favori (toggle)', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await toggleRoute.POST(postReq(), { params: Promise.resolve({ id: RES_ID }) })
    expect(res.status).toBe(401)
  })

  it('renvoie 400 si l’id n’est pas un uuid', async () => {
    const res = await toggleRoute.POST(postReq(), {
      params: Promise.resolve({ id: 'pas-un-uuid' }),
    })
    expect(res.status).toBe(400)
  })

  it('renvoie 404 si la ressource est introuvable', async () => {
    mockResFindUnique.mockResolvedValue(null)
    const res = await toggleRoute.POST(postReq(), { params: Promise.resolve({ id: RES_ID }) })
    expect(res.status).toBe(404)
  })

  it('renvoie 404 si la ressource n’est pas publique', async () => {
    mockResFindUnique.mockResolvedValue({ id: RES_ID, estPublic: false })
    const res = await toggleRoute.POST(postReq(), { params: Promise.resolve({ id: RES_ID }) })
    expect(res.status).toBe(404)
  })

  it('crée le favori (201, favori:true) si absent', async () => {
    mockResFindUnique.mockResolvedValue({ id: RES_ID, estPublic: true })
    mockFavFindUnique.mockResolvedValue(null)
    mockFavCreate.mockResolvedValue({ cjsUid: 'uid-1', ressourceId: RES_ID, createdAt: new Date() })

    const res = await toggleRoute.POST(postReq(), { params: Promise.resolve({ id: RES_ID }) })
    expect(res.status).toBe(201)
    const body = await res.json()
    expect(body.data).toEqual({ ressourceId: RES_ID, favori: true })
    expect(mockFavCreate).toHaveBeenCalledWith({
      data: { cjsUid: 'uid-1', ressourceId: RES_ID },
    })
    expect(mockFavDelete).not.toHaveBeenCalled()
  })

  it('supprime le favori (200, favori:false) s’il existe déjà', async () => {
    mockResFindUnique.mockResolvedValue({ id: RES_ID, estPublic: true })
    mockFavFindUnique.mockResolvedValue({
      cjsUid: 'uid-1',
      ressourceId: RES_ID,
      createdAt: new Date(),
    })
    mockFavDelete.mockResolvedValue({})

    const res = await toggleRoute.POST(postReq(), { params: Promise.resolve({ id: RES_ID }) })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ ressourceId: RES_ID, favori: false })
    expect(mockFavDelete).toHaveBeenCalled()
    expect(mockFavCreate).not.toHaveBeenCalled()
  })
})

describe('GET /api/favoris/ressources', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await listRoute.GET(getReq('/api/favoris/ressources'))
    expect(res.status).toBe(401)
  })

  it('renvoie les ressources favorites paginées', async () => {
    mockFavFindMany.mockResolvedValue([{ ressource: RESSOURCE }])
    mockFavCount.mockResolvedValue(1)

    const res = await listRoute.GET(getReq('/api/favoris/ressources'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toHaveLength(1)
    expect(body.data[0].id).toBe(RES_ID)
    expect(body.data[0].niveau).toBe('Debutant')
    expect(body.meta).toEqual({ total: 1, page: 1, limit: 20 })
    expect(mockFavFindMany.mock.calls[0][0].where).toEqual({ cjsUid: 'uid-1' })
  })
})

describe('GET /api/favoris/ressources/ids', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await idsRoute.GET(getReq('/api/favoris/ressources/ids'))
    expect(res.status).toBe(401)
  })

  it('renvoie le set complet d’IDs', async () => {
    mockFavFindMany.mockResolvedValue([
      { ressourceId: 'r1' },
      { ressourceId: 'r2' },
    ])
    const res = await idsRoute.GET(getReq('/api/favoris/ressources/ids'))
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual(['r1', 'r2'])
    expect(mockFavFindMany.mock.calls[0][0]).toEqual({
      where: { cjsUid: 'uid-1' },
      select: { ressourceId: true },
    })
  })
})
