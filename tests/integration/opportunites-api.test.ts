/**
 * @jest-environment node
 *
 * Tests d'intégration de `GET /api/opportunites` (GUIC-20).
 * Le loader et le rate-limit sont mockés.
 */

import { NextRequest, NextResponse } from 'next/server'

const mockListOpportunites = jest.fn()
jest.mock('@/lib/opportunites-loader', () => ({
  listOpportunites: (...a: unknown[]) => mockListOpportunites(...a),
}))

const mockRateLimit = jest.fn()
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
}))

// eslint-disable-next-line @typescript-eslint/no-require-imports
const route = require('@/app/api/opportunites/route')

const ITEM = {
  id: 'o1',
  slug: 'stage-agriculture',
  titre: 'Stage en agriculture',
  type: 'Stage',
  domaine: 'Economie',
  region: 'Dakar',
  organisation: 'CJS',
  remuneration: null,
  deadline: '2026-12-01T00:00:00.000Z',
}

function req(qs = ''): NextRequest {
  return new NextRequest(`http://localhost/api/opportunites${qs}`)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRateLimit.mockResolvedValue(null)
  mockListOpportunites.mockResolvedValue({ items: [ITEM], total: 1, page: 1, pageSize: 20 })
})

describe('GET /api/opportunites', () => {
  it('renvoie 200 avec data + meta et les paramètres par défaut', async () => {
    const res = await route.GET(req())
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.data).toEqual([ITEM])
    expect(body.meta).toEqual({ total: 1, page: 1, limit: 20 })

    expect(mockListOpportunites).toHaveBeenCalledWith({
      q: undefined,
      domaine: undefined,
      type: undefined,
      region: undefined,
      page: 1,
      sortBy: 'recent',
    })
  })

  it('transmet les filtres, la recherche, le tri et la page au loader', async () => {
    await route.GET(req('?q=stage&domaine=Economie&type=Emploi&region=Thies&sort_by=deadline&page=2'))
    expect(mockListOpportunites).toHaveBeenCalledWith({
      q: 'stage',
      domaine: 'Economie',
      type: 'Emploi',
      region: 'Thies',
      page: 2,
      sortBy: 'deadline',
    })
  })

  it('ignore silencieusement une valeur d’enum invalide (GUIC-256 — graceful degrade)', async () => {
    const res = await route.GET(req('?domaine=Xyz'))
    expect(res.status).toBe(200)
    // Multi-select : la valeur invalide est filtrée → domaine non transmis au loader.
    expect(mockListOpportunites).toHaveBeenCalled()
    const filtres = mockListOpportunites.mock.calls[0][0]
    expect(filtres.domaine).toBeUndefined()
  })

  it('rejette une page invalide (0 ou non numérique) avec 400', async () => {
    expect((await route.GET(req('?page=0'))).status).toBe(400)
    expect((await route.GET(req('?page=abc'))).status).toBe(400)
    expect(mockListOpportunites).not.toHaveBeenCalled()
  })

  it('renvoie la réponse du rate-limit quand la limite est atteinte', async () => {
    mockRateLimit.mockResolvedValue(
      NextResponse.json({ error: { code: 'RATE_LIMITED', message: 'Trop de requêtes' } }, { status: 429 }),
    )
    const res = await route.GET(req())
    expect(res.status).toBe(429)
    expect(mockListOpportunites).not.toHaveBeenCalled()
  })
})
