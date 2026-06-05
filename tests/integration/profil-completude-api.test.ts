/**
 * @jest-environment node
 *
 * GUIC-232 — Tests d'intégration de `GET /api/profil/completude`.
 */

import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

const mockCheckCompletude = jest.fn()
jest.mock('@/lib/profil-completude', () => ({
  checkProfilCompletude: (...a: unknown[]) => mockCheckCompletude(...a),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/profil/completude/route')

const SESSION = {
  cjsUid: 'uid-1',
  prenom: 'Awa',
  nom: 'Diop',
  email: 'awa@example.com',
  telephone: '+221770000000',
  region: 'Dakar',
}

const getReq = () => new NextRequest('http://localhost/api/profil/completude')

beforeEach(() => {
  jest.clearAllMocks()
  mockGetSession.mockResolvedValue(SESSION)
})

describe('GET /api/profil/completude', () => {
  it('renvoie 401 si non authentifié', async () => {
    mockGetSession.mockResolvedValue(null)
    const res = await route.GET(getReq())
    expect(res.status).toBe(401)
  })

  it('renvoie { complet: true, missing: [] } pour un profil complet', async () => {
    mockCheckCompletude.mockResolvedValue({ complet: true, missing: [] })
    const res = await route.GET(getReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data).toEqual({ complet: true, missing: [] })
    // Pas de cache partagé sur des données personnelles.
    expect(res.headers.get('Cache-Control')).toBe('private, no-store')
  })

  it('renvoie la liste des champs manquants pour un profil incomplet', async () => {
    mockCheckCompletude.mockResolvedValue({
      complet: false,
      missing: ['region', 'niveauEtude', 'domainesInteret'],
    })
    const res = await route.GET(getReq())
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.data.complet).toBe(false)
    expect(body.data.missing).toEqual(['region', 'niveauEtude', 'domainesInteret'])
    // Le helper a bien reçu l'identité de la session.
    expect(mockCheckCompletude).toHaveBeenCalledWith('uid-1', {
      prenom: 'Awa',
      nom: 'Diop',
      email: 'awa@example.com',
      telephone: '+221770000000',
      region: 'Dakar',
    })
  })
})
