/**
 * @jest-environment node
 *
 * Tests d'intégration `POST /api/candidatures` — auto-fill / formulaireData
 * (GUIC-361). Vérifie que le snapshot des champs profil est bien validé et
 * persisté dans `Candidature.formulaireData`.
 */
import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

const mockOppFindUnique = jest.fn()
const mockCandCreate = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: { findUnique: (...a: unknown[]) => mockOppFindUnique(...a) },
    candidature: {
      create: (...a: unknown[]) => mockCandCreate(...a),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
  extractIp: jest.fn().mockReturnValue('192.0.2.1'),
}))
jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
  hashId: jest.fn().mockReturnValue('abcd1234'),
}))
jest.mock('@/lib/notifications', () => ({
  notifyCandidatureConfirmee: jest.fn(),
}))
jest.mock('@/lib/profil-completude', () => ({
  checkProfilCompletude: jest.fn().mockResolvedValue({ complet: true, missing: [] }),
}))
jest.mock('next/server', () => {
  const actual = jest.requireActual('next/server')
  return { ...actual, after: (cb: () => unknown) => cb() }
})

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/candidatures/route')

const SESSION = {
  cjsUid: 'uid-1',
  prenom: 'Awa',
  nom: 'Diop',
  email: 'awa@example.sn',
  telephone: '+221770000000',
  region: 'Dakar',
}
const OPP_ID = '11111111-1111-4111-8111-111111111111'
const LETTRE_OK = 'Motivée et passionnée. '.repeat(20)
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

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
  mockOppFindUnique.mockResolvedValue(OPP)
  mockCandCreate.mockResolvedValue({ id: 'c1', cjsUid: 'uid-1', opportuniteId: OPP_ID })
})

describe('POST /api/candidatures — formulaireData (GUIC-361)', () => {
  it('persiste le snapshot formulaireData fourni dans le body', async () => {
    const formulaireData = {
      email: 'awa.diop@example.sn',
      telephone: '+221776543210',
      niveauEtude: 'Bac+3',
      situationEmploi: 'Étudiante',
      competences: ['JavaScript', 'Python'],
      domainesInteret: ['Numérique'],
    }
    const res = await route.POST(
      postReq({
        opportuniteId: OPP_ID,
        lettreMotivation: LETTRE_OK,
        notificationsConsent: true,
        formulaireData,
      }),
    )
    expect(res.status).toBe(201)
    expect(mockCandCreate).toHaveBeenCalledTimes(1)
    const createArgs = mockCandCreate.mock.calls[0]![0] as {
      data: { formulaireData?: typeof formulaireData }
    }
    expect(createArgs.data.formulaireData).toEqual(formulaireData)
  })

  it('reste rétrocompatible : accepte un POST sans formulaireData', async () => {
    const res = await route.POST(
      postReq({
        opportuniteId: OPP_ID,
        lettreMotivation: LETTRE_OK,
        notificationsConsent: false,
      }),
    )
    expect(res.status).toBe(201)
    const createArgs = mockCandCreate.mock.calls[0]![0] as {
      data: { formulaireData?: unknown }
    }
    // Absent ou undefined — pas d'erreur, persistance optionnelle.
    expect(createArgs.data.formulaireData).toBeUndefined()
  })
})
