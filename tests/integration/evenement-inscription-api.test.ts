/**
 * @jest-environment node
 *
 * Tests d'intégration de l'API d'inscription aux événements (GUIC-23) :
 * GET / POST / DELETE /api/evenements/[id]/inscription.
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

const mockEvtFindUnique = jest.fn()
const mockInscFindUnique = jest.fn()
const mockInscCreate = jest.fn()
const mockInscUpdate = jest.fn()
const mockInscUpdateMany = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    evenement: {
      findUnique: (...a: unknown[]) => mockEvtFindUnique(...a),
    },
    inscriptionEvenement: {
      findUnique: (...a: unknown[]) => mockInscFindUnique(...a),
      create: (...a: unknown[]) => mockInscCreate(...a),
      update: (...a: unknown[]) => mockInscUpdate(...a),
      updateMany: (...a: unknown[]) => mockInscUpdateMany(...a),
    },
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/evenements/[id]/inscription/route')

const SESSION = { cjsUid: 'uid-1', nom: 'Diallo', prenom: 'Awa' }
const EVT_ID = 'evt-123'
const futureDate = new Date(Date.now() + 24 * 60 * 60 * 1000) // J+1
const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000) // J-1

function req(method: 'GET' | 'POST' | 'DELETE'): NextRequest {
  return new NextRequest(`http://localhost/api/evenements/${EVT_ID}/inscription`, { method })
}
const ctx = { params: Promise.resolve({ id: EVT_ID }) }

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
})

describe('GET /api/evenements/[id]/inscription', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await route.GET(req('GET'), ctx)
    expect(res.status).toBe(401)
  })

  it('renvoie { inscrit: false } si aucune ligne en base', async () => {
    mockInscFindUnique.mockResolvedValue(null)
    const res = await route.GET(req('GET'), ctx)
    expect(res.status).toBe(200)
    expect((await res.json()).data).toEqual({ inscrit: false })
  })

  it('renvoie { inscrit: true } si statut=inscrit', async () => {
    mockInscFindUnique.mockResolvedValue({ statut: 'inscrit' })
    const res = await route.GET(req('GET'), ctx)
    expect((await res.json()).data).toEqual({ inscrit: true })
  })

  it('renvoie { inscrit: false } si statut=annule', async () => {
    mockInscFindUnique.mockResolvedValue({ statut: 'annule' })
    const res = await route.GET(req('GET'), ctx)
    expect((await res.json()).data).toEqual({ inscrit: false })
  })
})

describe('POST /api/evenements/[id]/inscription', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await route.POST(req('POST'), ctx)
    expect(res.status).toBe(401)
  })

  it('renvoie 404 si événement inconnu', async () => {
    mockEvtFindUnique.mockResolvedValue(null)
    const res = await route.POST(req('POST'), ctx)
    expect(res.status).toBe(404)
    expect(mockInscCreate).not.toHaveBeenCalled()
  })

  it('renvoie 409 si événement terminé', async () => {
    mockEvtFindUnique.mockResolvedValue({ id: EVT_ID, statut: 'termine', dateDebut: futureDate, dateFin: null })
    const res = await route.POST(req('POST'), ctx)
    expect(res.status).toBe(409)
  })

  it('renvoie 409 si date déjà passée même si statut=a_venir (cron en retard)', async () => {
    mockEvtFindUnique.mockResolvedValue({ id: EVT_ID, statut: 'a_venir', dateDebut: pastDate, dateFin: pastDate })
    const res = await route.POST(req('POST'), ctx)
    expect(res.status).toBe(409)
    expect((await res.json()).error.message).toMatch(/passé/i)
    expect(mockInscCreate).not.toHaveBeenCalled()
  })

  it('crée l\'inscription et renvoie 201', async () => {
    mockEvtFindUnique.mockResolvedValue({ id: EVT_ID, statut: 'a_venir', dateDebut: futureDate, dateFin: null })
    mockInscFindUnique.mockResolvedValue(null)
    mockInscCreate.mockResolvedValue({ id: 'i1', cjsUid: 'uid-1', evenementId: EVT_ID })
    const res = await route.POST(req('POST'), ctx)
    expect(res.status).toBe(201)
    expect(mockInscCreate).toHaveBeenCalledWith({
      data: { cjsUid: 'uid-1', evenementId: EVT_ID, statut: 'inscrit' },
    })
  })

  it('est idempotent : 200 sans recréer si déjà inscrit', async () => {
    mockEvtFindUnique.mockResolvedValue({ id: EVT_ID, statut: 'a_venir', dateDebut: futureDate, dateFin: null })
    mockInscFindUnique.mockResolvedValue({ id: 'i1', statut: 'inscrit' })
    const res = await route.POST(req('POST'), ctx)
    expect(res.status).toBe(200)
    expect(mockInscCreate).not.toHaveBeenCalled()
  })

  it('réactive une inscription annulée', async () => {
    mockEvtFindUnique.mockResolvedValue({ id: EVT_ID, statut: 'a_venir', dateDebut: futureDate, dateFin: null })
    mockInscFindUnique.mockResolvedValue({ id: 'i1', statut: 'annule' })
    mockInscUpdate.mockResolvedValue({ id: 'i1', statut: 'inscrit' })
    const res = await route.POST(req('POST'), ctx)
    expect(res.status).toBe(200)
    expect(mockInscUpdate).toHaveBeenCalledWith({
      where: { cjsUid_evenementId: { cjsUid: 'uid-1', evenementId: EVT_ID } },
      data: { statut: 'inscrit' },
    })
  })
})

describe('DELETE /api/evenements/[id]/inscription', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await route.DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(401)
  })

  it('annule l\'inscription et renvoie 204', async () => {
    mockInscUpdateMany.mockResolvedValue({ count: 1 })
    const res = await route.DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(204)
    expect(mockInscUpdateMany).toHaveBeenCalledWith({
      where: { cjsUid: 'uid-1', evenementId: EVT_ID, statut: { not: 'annule' } },
      data: { statut: 'annule' },
    })
  })

  it('est idempotent : 204 même si rien à annuler', async () => {
    mockInscUpdateMany.mockResolvedValue({ count: 0 })
    const res = await route.DELETE(req('DELETE'), ctx)
    expect(res.status).toBe(204)
  })
})
