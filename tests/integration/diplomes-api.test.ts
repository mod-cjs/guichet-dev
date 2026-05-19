/**
 * @jest-environment node
 *
 * Tests d'intégration des routes /api/profil/diplomes (GET + POST)
 * et /api/profil/diplomes/[id] (PUT + DELETE).
 *
 * Prisma, auth, rate-limit et recalculerEtPersisterScore sont mockés.
 */

import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...args: unknown[]) => mockGetSession(...args),
}))

const mockDiplomeFindMany  = jest.fn()
const mockDiplomeFindFirst = jest.fn()
const mockDiplomeCount     = jest.fn()
const mockDiplomeCreate    = jest.fn()
const mockDiplomeUpdate    = jest.fn()
const mockDiplomeDelete    = jest.fn()
const mockProfilUpsert     = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    diplome: {
      findMany:  (...args: unknown[]) => mockDiplomeFindMany(...args),
      findFirst: (...args: unknown[]) => mockDiplomeFindFirst(...args),
      count:     (...args: unknown[]) => mockDiplomeCount(...args),
      create:    (...args: unknown[]) => mockDiplomeCreate(...args),
      update:    (...args: unknown[]) => mockDiplomeUpdate(...args),
      delete:    (...args: unknown[]) => mockDiplomeDelete(...args),
    },
    profilJeune: {
      upsert: (...args: unknown[]) => mockProfilUpsert(...args),
    },
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

const mockRecalculer = jest.fn().mockResolvedValue(80)
jest.mock('@/lib/profil-loader', () => ({
  recalculerEtPersisterScore: (...args: unknown[]) => mockRecalculer(...args),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// Import après mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const listRoute = require('@/app/api/profil/diplomes/route')
// eslint-disable-next-line @typescript-eslint/no-require-imports
const itemRoute = require('@/app/api/profil/diplomes/[id]/route')

// ── Helpers ────────────────────────────────────────────────────────────────

const SESSION = {
  cjsUid:             'uid-abc',
  nom:                'Diallo',
  prenom:             'Fatou',
  email:              'fatou@example.sn',
  telephone:          null,
  region:             null,
  roles:              ['beneficiaire'],
  accessToken:        'tok',
  refreshToken:       'rtok',
  expiresAt:          Math.floor(Date.now() / 1000) + 3600,
  onboardingComplete: true,
}

const VALID_PAYLOAD = {
  intitule:       'Licence en Informatique',
  etablissement:  'Université Cheikh Anta Diop',
  anneeObtention: 2024,
  niveau:         'licence',
  mention:        'bien',
}

const DIPLOME_DB = {
  id:             'dip-1',
  intitule:       'Licence en Informatique',
  etablissement:  'Université Cheikh Anta Diop',
  anneeObtention: 2024,
  niveau:         'licence',
  mention:        'bien',
}

function jsonReq(url: string, method: string, body?: unknown): NextRequest {
  const init: { method: string; headers: Record<string, string>; body?: string } = {
    method,
    headers: { 'Content-Type': 'application/json' },
  }
  if (body !== undefined) init.body = JSON.stringify(body)
  return new NextRequest(url, init)
}

const params = (id: string) => ({ params: Promise.resolve({ id }) })

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks()
  mockRecalculer.mockResolvedValue(80)
})

describe('GET /api/profil/diplomes', () => {
  it('retourne 401 sans session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await listRoute.GET(jsonReq('http://localhost/api/profil/diplomes', 'GET'))
    expect(res.status).toBe(401)
  })

  it('retourne la liste triée par année DESC', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockDiplomeFindMany.mockResolvedValue([DIPLOME_DB])

    const res = await listRoute.GET(jsonReq('http://localhost/api/profil/diplomes', 'GET'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual([DIPLOME_DB])
    expect(mockDiplomeFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where:   { profil: { cjsUid: 'uid-abc' } },
        orderBy: { anneeObtention: 'desc' },
      }),
    )
  })
})

describe('POST /api/profil/diplomes', () => {
  it('retourne 401 sans session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await listRoute.POST(jsonReq('http://localhost/api/profil/diplomes', 'POST', VALID_PAYLOAD))
    expect(res.status).toBe(401)
  })

  it('retourne 400 si payload invalide (intitulé manquant)', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    const res = await listRoute.POST(jsonReq('http://localhost/api/profil/diplomes', 'POST', { ...VALID_PAYLOAD, intitule: '' }))
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error.code).toBe('VALIDATION_ERROR')
  })

  it("retourne 400 si l'année est future", async () => {
    mockGetSession.mockResolvedValue(SESSION)
    const future = new Date().getFullYear() + 1
    const res = await listRoute.POST(jsonReq('http://localhost/api/profil/diplomes', 'POST', { ...VALID_PAYLOAD, anneeObtention: future }))
    expect(res.status).toBe(400)
  })

  it("retourne 400 si l'année est antérieure à 1950", async () => {
    mockGetSession.mockResolvedValue(SESSION)
    const res = await listRoute.POST(jsonReq('http://localhost/api/profil/diplomes', 'POST', { ...VALID_PAYLOAD, anneeObtention: 1949 }))
    expect(res.status).toBe(400)
  })

  it('crée le diplôme, recalcule le score et retourne 201', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockDiplomeCount.mockResolvedValue(3)
    mockProfilUpsert.mockResolvedValue({ id: 'profil-1' })
    mockDiplomeCreate.mockResolvedValue(DIPLOME_DB)
    mockRecalculer.mockResolvedValue(95)

    const res = await listRoute.POST(jsonReq('http://localhost/api/profil/diplomes', 'POST', VALID_PAYLOAD))
    const body = await res.json()

    expect(res.status).toBe(201)
    expect(body.data).toEqual({ ...DIPLOME_DB, completionScore: 95 })
    expect(mockDiplomeCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        profilId:       'profil-1',
        intitule:       VALID_PAYLOAD.intitule,
        anneeObtention: VALID_PAYLOAD.anneeObtention,
      }),
    }))
    expect(mockRecalculer).toHaveBeenCalledWith('uid-abc')
  })

  it('retourne 422 LIMIT_REACHED si 20 diplômes déjà présents', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockDiplomeCount.mockResolvedValue(20)

    const res = await listRoute.POST(jsonReq('http://localhost/api/profil/diplomes', 'POST', VALID_PAYLOAD))
    const body = await res.json()

    expect(res.status).toBe(422)
    expect(body.error.code).toBe('LIMIT_REACHED')
    expect(mockDiplomeCreate).not.toHaveBeenCalled()
  })
})

describe('PUT /api/profil/diplomes/[id]', () => {
  it('retourne 401 sans session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await itemRoute.PUT(jsonReq('http://localhost/api/profil/diplomes/dip-1', 'PUT', VALID_PAYLOAD), params('dip-1'))
    expect(res.status).toBe(401)
  })

  it("retourne 404 si le diplôme n'appartient pas à l'utilisateur", async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockDiplomeFindFirst.mockResolvedValue(null)

    const res = await itemRoute.PUT(jsonReq('http://localhost/api/profil/diplomes/dip-other', 'PUT', VALID_PAYLOAD), params('dip-other'))
    expect(res.status).toBe(404)
    expect(mockDiplomeUpdate).not.toHaveBeenCalled()
  })

  it('met à jour le diplôme et retourne le nouveau score', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockDiplomeFindFirst.mockResolvedValue({ id: 'dip-1' })
    mockDiplomeUpdate.mockResolvedValue({ ...DIPLOME_DB, intitule: 'Master en Informatique' })
    mockRecalculer.mockResolvedValue(100)

    const res = await itemRoute.PUT(
      jsonReq('http://localhost/api/profil/diplomes/dip-1', 'PUT', { ...VALID_PAYLOAD, intitule: 'Master en Informatique' }),
      params('dip-1'),
    )
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.intitule).toBe('Master en Informatique')
    expect(body.data.completionScore).toBe(100)
  })

  it('retourne 400 si payload invalide', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockDiplomeFindFirst.mockResolvedValue({ id: 'dip-1' })

    const res = await itemRoute.PUT(
      jsonReq('http://localhost/api/profil/diplomes/dip-1', 'PUT', { ...VALID_PAYLOAD, niveau: '' }),
      params('dip-1'),
    )
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/profil/diplomes/[id]', () => {
  it('retourne 401 sans session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await itemRoute.DELETE(jsonReq('http://localhost/api/profil/diplomes/dip-1', 'DELETE'), params('dip-1'))
    expect(res.status).toBe(401)
  })

  it("retourne 404 si le diplôme n'appartient pas à l'utilisateur", async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockDiplomeFindFirst.mockResolvedValue(null)

    const res = await itemRoute.DELETE(jsonReq('http://localhost/api/profil/diplomes/dip-other', 'DELETE'), params('dip-other'))
    expect(res.status).toBe(404)
    expect(mockDiplomeDelete).not.toHaveBeenCalled()
  })

  it('supprime le diplôme et retourne le nouveau score', async () => {
    mockGetSession.mockResolvedValue(SESSION)
    mockDiplomeFindFirst.mockResolvedValue({ id: 'dip-1' })
    mockDiplomeDelete.mockResolvedValue({})
    mockRecalculer.mockResolvedValue(70)

    const res = await itemRoute.DELETE(jsonReq('http://localhost/api/profil/diplomes/dip-1', 'DELETE'), params('dip-1'))
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data).toEqual({ completionScore: 70 })
    expect(mockDiplomeDelete).toHaveBeenCalledWith({ where: { id: 'dip-1' } })
  })
})
