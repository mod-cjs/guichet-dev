/**
 * @jest-environment node
 *
 * Tests `POST /api/reservations` (Wave 4 / GUIC-358).
 * Auth + rate-limit + transaction + codes erreurs.
 */

const mockRateLimit = jest.fn().mockResolvedValue(null)
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
}))

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({
  getSession: (...a: unknown[]) => mockGetSession(...a),
}))

jest.mock('@/lib/analytics/centre-events', () => ({
  trackCentreEvent: jest.fn().mockResolvedValue(undefined),
}))
jest.mock('@/lib/notifications/reservations', () => ({
  notifyReservation: jest.fn().mockResolvedValue(undefined),
}))

const mockRessourceFindUnique = jest.fn()
const mockReservationFindFirst = jest.fn()
const mockReservationCreate = jest.fn()
const mockTransaction = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    $transaction: (fn: unknown, opts?: unknown) => mockTransaction(fn, opts),
  },
}))

import { NextRequest } from 'next/server'
import { POST } from '@/app/api/reservations/route'

function req(body: unknown): NextRequest {
  return new NextRequest(new URL('http://localhost/api/reservations'), {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const VALID_BODY = {
  ressourceId: '11111111-1111-1111-1111-111111111111',
  dateReservee: new Date(Date.now() + 5 * 86400_000).toISOString(),
  creneauDebut: '14:00',
  creneauFin: '16:00',
  nombrePersonnes: 4,
  motif: 'Réunion projet maraichage 2026 — coordination équipe.',
}

const RESSOURCE = {
  id: VALID_BODY.ressourceId,
  centreId: 'c1',
  nom: 'Salle A',
  capacite: 8,
  requiresJustif: false,
  estActive: true,
}

function setupTxOk(reservationOverrides: Record<string, unknown> = {}) {
  mockTransaction.mockImplementation(async (fn) => {
    const tx = {
      ressourceCentre: { findUnique: mockRessourceFindUnique },
      reservation: {
        findFirst: mockReservationFindFirst,
        create: mockReservationCreate,
      },
    }
    return fn(tx)
  })
  mockRessourceFindUnique.mockResolvedValue(RESSOURCE)
  mockReservationFindFirst.mockResolvedValue(null)
  mockReservationCreate.mockResolvedValue({
    id: 'res-1',
    statut: 'Acceptee',
    centreId: 'c1',
    ressourceId: VALID_BODY.ressourceId,
    dateReservee: new Date(VALID_BODY.dateReservee),
    creneauDebut: '14:00',
    creneauFin: '16:00',
    ...reservationOverrides,
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue({ cjsUid: 'user-1' })
  mockRateLimit.mockResolvedValue(null)
})

describe('POST /api/reservations', () => {
  it('201 — crée la réservation et renvoie data.reservation', async () => {
    setupTxOk()
    const r = await POST(req(VALID_BODY))
    expect(r.status).toBe(201)
    const body = await r.json()
    expect(body.data.reservation.id).toBe('res-1')
    expect(body.data.reservation.statut).toBe('Acceptee')
  })

  it('401 si pas de session', async () => {
    mockGetSession.mockResolvedValue(null)
    const r = await POST(req(VALID_BODY))
    expect(r.status).toBe(401)
  })

  it('429 si rate-limit déclenché', async () => {
    const rlResp = new Response(JSON.stringify({ error: { code: 'RATE_LIMITED' } }), {
      status: 429,
    })
    mockRateLimit.mockResolvedValueOnce(rlResp)
    const r = await POST(req(VALID_BODY))
    expect(r.status).toBe(429)
  })

  it('400 si motif trop court', async () => {
    const r = await POST(req({ ...VALID_BODY, motif: 'court' }))
    expect(r.status).toBe(400)
  })

  it('400 si nombrePersonnes > capacite', async () => {
    setupTxOk()
    const r = await POST(req({ ...VALID_BODY, nombrePersonnes: 50 }))
    expect(r.status).toBe(400)
    const body = await r.json()
    expect(body.error.code).toBe('CAPACITE_DEPASSEE')
  })

  it('400 JUSTIF_REQUIS si ressource exige justif sans fichier', async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        ressourceCentre: {
          findUnique: jest.fn().mockResolvedValue({
            ...RESSOURCE,
            requiresJustif: true,
          }),
        },
        reservation: {
          findFirst: jest.fn().mockResolvedValue(null),
          create: jest.fn(),
        },
      }
      return fn(tx)
    })
    const r = await POST(req(VALID_BODY))
    expect(r.status).toBe(400)
    const body = await r.json()
    expect(body.error.code).toBe('JUSTIF_REQUIS')
  })

  it('409 CRENEAU_OCCUPE si conflit', async () => {
    mockTransaction.mockImplementation(async (fn) => {
      const tx = {
        ressourceCentre: {
          findUnique: jest.fn().mockResolvedValue(RESSOURCE),
        },
        reservation: {
          findFirst: jest.fn().mockResolvedValue({ id: 'existing' }),
          create: jest.fn(),
        },
      }
      return fn(tx)
    })
    const r = await POST(req(VALID_BODY))
    expect(r.status).toBe(409)
    const body = await r.json()
    expect(body.error.code).toBe('CRENEAU_OCCUPE')
  })

  it('400 si date passée', async () => {
    const r = await POST(
      req({
        ...VALID_BODY,
        dateReservee: new Date(Date.now() - 86400_000).toISOString(),
      }),
    )
    expect(r.status).toBe(400)
    const body = await r.json()
    expect(body.error.code).toBe('DATE_INVALIDE')
  })
})
