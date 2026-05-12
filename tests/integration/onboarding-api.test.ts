/**
 * @jest-environment node
 *
 * Tests d'intégration de GET+PUT /api/v1/onboarding.
 * Prisma, auth et rate-limit sont mockés.
 */

import { NextRequest } from 'next/server'

// ── Mocks ──────────────────────────────────────────────────────────────────

const mockGetSession       = jest.fn()
const mockEncodeSession    = jest.fn()
const mockSetSessionCookie = jest.fn()

jest.mock('@/lib/auth', () => ({
  getSession:       (...args: unknown[]) => mockGetSession(...args),
  encodeSession:    (...args: unknown[]) => mockEncodeSession(...args),
  setSessionCookie: (...args: unknown[]) => mockSetSessionCookie(...args),
}))

const mockFindUnique = jest.fn()
const mockUpdate     = jest.fn()
const mockTx         = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: {
      findUnique: (...args: unknown[]) => mockFindUnique(...args),
      update:     (...args: unknown[]) => mockUpdate(...args),
    },
    $transaction: (fn: (tx: unknown) => Promise<unknown>) =>
      fn({
        utilisateur: { update: mockUpdate },
        profilJeune: { upsert: mockTx },
      }),
  },
}))

// Rate-limit désactivé en test (retourne null = pas limité)
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

// Import après mocks
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { GET, PUT } = require('@/app/api/v1/onboarding/route')

// ── Helpers ────────────────────────────────────────────────────────────────

function makeGetRequest(): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/onboarding')
}

function makePutRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost:3000/api/v1/onboarding', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

const BASE_SESSION = {
  cjsUid:             'uid-abc',
  nom:                'Diallo',
  prenom:             'Fatou',
  email:              'fatou@example.sn',
  telephone:          null,
  region:             null,
  roles:              ['beneficiaire'],
  accessToken:        'access-tok',
  refreshToken:       'refresh-tok',
  expiresAt:          Math.floor(Date.now() / 1000) + 3600,
  onboardingComplete: false,
}

beforeEach(() => {
  jest.clearAllMocks()
  mockEncodeSession.mockResolvedValue('new-encoded-jwt')
  mockSetSessionCookie.mockReturnValue(undefined)
})

// ── GET ────────────────────────────────────────────────────────────────────

describe('GET /api/v1/onboarding', () => {
  it('retourne 401 si pas de session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(401)
    const json = await res.json()
    expect(json.error.code).toBe('UNAUTHORIZED')
  })

  it('retourne 404 si utilisateur introuvable en base', async () => {
    mockGetSession.mockResolvedValue(BASE_SESSION)
    mockFindUnique.mockResolvedValue(null)
    const res = await GET(makeGetRequest())
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error.code).toBe('NOT_FOUND')
  })

  it('retourne les données identite/localisation/profil de l\'utilisateur', async () => {
    mockGetSession.mockResolvedValue(BASE_SESSION)
    mockFindUnique.mockResolvedValue({
      nom:           'Diallo',
      prenom:        'Fatou',
      dateNaissance: new Date('2000-05-12'),
      genre:         'F',
      region:        'Dakar',
      commune:       'Plateau',
      profil: {
        niveauEtude:     'bac',
        situationEmploi: 'etudiant',
        domainesInteret: ['tech', 'sante'],
      },
    })

    const res  = await GET(makeGetRequest())
    expect(res.status).toBe(200)
    const json = await res.json()

    expect(json.data.identite.nom).toBe('Diallo')
    expect(json.data.identite.dateNaissance).toBe('2000-05-12')
    expect(json.data.identite.genre).toBe('F')
    expect(json.data.localisation.region).toBe('Dakar')
    expect(json.data.localisation.commune).toBe('Plateau')
    expect(json.data.profil.domainesInteret).toEqual(['tech', 'sante'])
  })

  it('retourne null et [] si données manquantes', async () => {
    mockGetSession.mockResolvedValue(BASE_SESSION)
    mockFindUnique.mockResolvedValue({
      nom: 'Diallo', prenom: 'Fatou',
      dateNaissance: null, genre: null,
      region: null, commune: null,
      profil: null,
    })

    const res  = await GET(makeGetRequest())
    const json = await res.json()
    expect(json.data.identite.dateNaissance).toBeNull()
    expect(json.data.profil.domainesInteret).toEqual([])
  })
})

// ── PUT ────────────────────────────────────────────────────────────────────

describe('PUT /api/v1/onboarding — auth', () => {
  it('retourne 401 si pas de session', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await PUT(makePutRequest({ step: 1, data: { nom: 'X', prenom: 'Y' } }))
    expect(res.status).toBe(401)
  })

  it('retourne 400 si body JSON invalide', async () => {
    mockGetSession.mockResolvedValue(BASE_SESSION)
    const req = new NextRequest('http://localhost:3000/api/v1/onboarding', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: 'pas du json{',
    })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('retourne 422 si step est invalide', async () => {
    mockGetSession.mockResolvedValue(BASE_SESSION)
    const res = await PUT(makePutRequest({ step: 99, data: {} }))
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/v1/onboarding — étape 1 (identité)', () => {
  beforeEach(() => mockGetSession.mockResolvedValue(BASE_SESSION))

  it('met à jour nom/prenom/dateNaissance/genre et retourne nextStep=2', async () => {
    mockUpdate.mockResolvedValue({})
    const res = await PUT(makePutRequest({
      step: 1,
      data: {
        nom:           'Diallo',
        prenom:        'Fatou',
        dateNaissance: '2000-05-12',
        genre:         'F',
      },
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.nextStep).toBe(2)
    expect(json.data.onboardingComplete).toBe(false)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cjsUid: 'uid-abc' },
        data:  expect.objectContaining({ nom: 'Diallo', prenom: 'Fatou' }),
      })
    )
  })

  it('accepte dateNaissance null', async () => {
    mockUpdate.mockResolvedValue({})
    const res = await PUT(makePutRequest({
      step: 1,
      data: { nom: 'Diallo', prenom: 'Fatou', dateNaissance: null, genre: null },
    }))
    expect(res.status).toBe(200)
  })

  it('retourne 422 si nom manquant', async () => {
    const res = await PUT(makePutRequest({ step: 1, data: { prenom: 'Fatou' } }))
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/v1/onboarding — étape 2 (localisation)', () => {
  beforeEach(() => mockGetSession.mockResolvedValue(BASE_SESSION))

  it('met à jour region/commune et retourne nextStep=3', async () => {
    mockUpdate.mockResolvedValue({})
    const res = await PUT(makePutRequest({
      step: 2,
      data: { region: 'DAKAR', commune: 'Plateau' },
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.nextStep).toBe(3)
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cjsUid: 'uid-abc' },
        data:  expect.objectContaining({ region: 'DAKAR' }),
      })
    )
  })

  it('retourne 422 si region manquante', async () => {
    const res = await PUT(makePutRequest({ step: 2, data: { commune: 'Plateau' } }))
    expect(res.status).toBe(422)
  })
})

describe('PUT /api/v1/onboarding — étape 3 (profil + complétion)', () => {
  beforeEach(() => {
    mockGetSession.mockResolvedValue(BASE_SESSION)
    mockTx.mockResolvedValue({})
    mockUpdate.mockResolvedValue({})
  })

  it('upsert profilJeune, marque onboardingComplete=true, nextStep=null', async () => {
    const res = await PUT(makePutRequest({
      step: 3,
      data: {
        niveauEtude:     'bac',
        situationEmploi: 'etudiant',
        domainesInteret: ['tech', 'sante'],
      },
    }))
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.data.nextStep).toBeNull()
    expect(json.data.onboardingComplete).toBe(true)

    expect(mockTx).toHaveBeenCalledWith(
      expect.objectContaining({
        where:  { cjsUid: 'uid-abc' },
        update: expect.objectContaining({ domainesInteret: ['tech', 'sante'] }),
        create: expect.objectContaining({ cjsUid: 'uid-abc' }),
      })
    )
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { cjsUid: 'uid-abc' },
        data:  { onboardingComplete: true },
      })
    )
  })

  it('met à jour le cookie de session avec onboardingComplete=true', async () => {
    await PUT(makePutRequest({
      step: 3,
      data: { niveauEtude: 'bac', situationEmploi: 'etudiant', domainesInteret: [] },
    }))

    expect(mockEncodeSession).toHaveBeenCalledWith(
      expect.objectContaining({ onboardingComplete: true })
    )
    expect(mockSetSessionCookie).toHaveBeenCalled()
  })

  it('accepte des champs profil optionnels null', async () => {
    const res = await PUT(makePutRequest({
      step: 3,
      data: { niveauEtude: null, situationEmploi: null, domainesInteret: [] },
    }))
    expect(res.status).toBe(200)
  })
})
