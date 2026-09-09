/**
 * @jest-environment node
 *
 * GUIC-689 (M4, lot 3) — Un seul scan, deux sens.
 *
 * Au comptoir, le staff scanne la carte : le système déduit s'il s'agit d'une
 * entrée ou d'une sortie. Demander au staff de choisir ajouterait un geste et
 * une erreur possible ; l'état en base sait déjà.
 *
 * La contrainte qui commande tout : l'anti-rejeu Redis consomme le nonce du
 * jeton pour 24 h (`SET NX checkin:<nonce>`). Un même QR ne pouvait donc servir
 * qu'UNE fois. Chaque sens reçoit son propre espace de clé — `checkin:` et
 * `checkout:` — pour qu'un jeton serve une fois à l'entrée et une fois à la
 * sortie, sans rouvrir la fenêtre de rejeu à l'intérieur d'un sens.
 *
 * Le sens est décidé AVANT la consommation du nonce : sinon on consommerait la
 * clé du mauvais espace et le second scan serait refusé.
 */
const mockRateLimit = jest.fn().mockResolvedValue(null)
jest.mock('@/lib/rate-limit', () => ({ rateLimit: (...a: unknown[]) => mockRateLimit(...a) }))

const mockRedisSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: { set: (...a: unknown[]) => mockRedisSet(...a), del: jest.fn() },
}))

const mockVerify = jest.fn()
jest.mock('@/lib/auth/verifyCJSCardToken', () => {
  class CJSCardTokenError extends Error {
    constructor(public reason: 'expired' | 'invalid') { super(reason); this.name = 'CJSCardTokenError' }
  }
  return { verifyCJSCardToken: (...a: unknown[]) => mockVerify(...a), CJSCardTokenError }
})

jest.mock('@/lib/auth/checkin-operator', () => ({
  getCheckinOperator: async () => ({
    kind: 'staff', activeCentreId: 'c-1', centreIds: ['c-1'],
    email: 'agent@cjs.sn', label: 'agent@cjs.sn',
  }),
}))

jest.mock('@/lib/analytics/centre-events', () => ({ trackCentreEvent: jest.fn().mockResolvedValue(undefined) }))

const mockCentre = jest.fn()
const mockUser = jest.fn()
const mockCheckInCreate = jest.fn()
const mockCheckInFindFirst = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    centre: { findUnique: (...a: unknown[]) => mockCentre(...a) },
    utilisateur: { findUnique: (...a: unknown[]) => mockUser(...a) },
    reservation: { findUnique: jest.fn(), update: jest.fn() },
    checkIn: {
      create: (...a: unknown[]) => mockCheckInCreate(...a),
      findFirst: (...a: unknown[]) => mockCheckInFindFirst(...a),
    },
  },
}))

const mockEnregistrerSortie = jest.fn()
jest.mock('@/lib/centres/sortie', () => ({
  enregistrerSortie: (...a: unknown[]) => mockEnregistrerSortie(...a),
}))

import { NextRequest } from 'next/server'

import { POST } from '@/app/api/v1/checkin/[token]/route'

const req = () =>
  new NextRequest(new URL('http://localhost/api/v1/checkin/tok'), {
    method: 'POST',
    body: JSON.stringify({ centreId: 'c-1' }),
    headers: { 'Content-Type': 'application/json' },
  })
const ctx = () => ({ params: Promise.resolve({ token: 'tok' }) })

beforeEach(() => {
  jest.clearAllMocks()
  mockRateLimit.mockResolvedValue(null)
  mockVerify.mockResolvedValue({ sub: 'user-1', nonce: 'n-1', iat: 1, exp: 9 })
  mockRedisSet.mockResolvedValue('OK')
  mockCentre.mockResolvedValue({ id: 'c-1' })
  mockUser.mockResolvedValue({ cjsUid: 'user-1', nom: 'Diop', prenom: 'Awa' })
  mockCheckInCreate.mockResolvedValue({ id: 'ci-1' })
  mockEnregistrerSortie.mockResolvedValue({ id: 's-1', checkInId: 'ci-0', dureeMinutes: 42 })
})

describe('GUIC-689 (M4) — le sens est déduit de l’état', () => {
  it('aucune entrée ouverte → ENTRÉE', async () => {
    mockCheckInFindFirst.mockResolvedValue(null)

    const res = await POST(req(), ctx())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.sens).toBe('entree')
    expect(body.data.checkInId).toBe('ci-1')
    expect(mockCheckInCreate).toHaveBeenCalled()
    expect(mockEnregistrerSortie).not.toHaveBeenCalled()
  })

  it('une entrée ouverte → SORTIE, avec la durée', async () => {
    mockCheckInFindFirst.mockResolvedValue({ id: 'ci-0' })

    const res = await POST(req(), ctx())
    const body = await res.json()

    expect(res.status).toBe(200)
    expect(body.data.sens).toBe('sortie')
    expect(body.data.dureeMinutes).toBe(42)
    expect(mockCheckInCreate).not.toHaveBeenCalled()
    expect(mockEnregistrerSortie).toHaveBeenCalled()
  })

  it('l’entrée ouverte est cherchée dans CE centre et pour CE jeune', async () => {
    mockCheckInFindFirst.mockResolvedValue(null)
    await POST(req(), ctx())

    const where = mockCheckInFindFirst.mock.calls[0][0].where
    expect(where).toMatchObject({ cjsUid: 'user-1', centreId: 'c-1', sortie: null })
  })
})

describe('GUIC-689 (M4) — chaque sens a son espace de nonce', () => {
  it('une entrée consomme `checkin:<nonce>`', async () => {
    mockCheckInFindFirst.mockResolvedValue(null)
    await POST(req(), ctx())
    expect(mockRedisSet.mock.calls[0][0]).toBe('checkin:n-1')
  })

  it('une sortie consomme `checkout:<nonce>` — le même jeton reste utilisable', async () => {
    mockCheckInFindFirst.mockResolvedValue({ id: 'ci-0' })
    await POST(req(), ctx())
    expect(mockRedisSet.mock.calls[0][0]).toBe('checkout:n-1')
  })

  it('le sens est décidé AVANT la consommation du nonce', async () => {
    // Sinon on consommerait la clé du mauvais espace, et le second scan du même
    // jeton serait refusé alors qu'il change de sens.
    const ordre: string[] = []
    mockCheckInFindFirst.mockImplementation(async () => { ordre.push('lecture-etat'); return null })
    mockRedisSet.mockImplementation(async () => { ordre.push('nonce'); return 'OK' })

    await POST(req(), ctx())
    expect(ordre).toEqual(['lecture-etat', 'nonce'])
  })

  it('rejeu dans le MÊME sens → 409', async () => {
    mockCheckInFindFirst.mockResolvedValue({ id: 'ci-0' })
    mockRedisSet.mockResolvedValue(null) // SET NX a échoué : clé déjà posée

    const res = await POST(req(), ctx())
    expect(res.status).toBe(409)
    expect(mockEnregistrerSortie).not.toHaveBeenCalled()
  })
})
