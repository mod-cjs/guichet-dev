/**
 * @jest-environment node
 *
 * GUIC-256 — API /api/opportunites multi-select.
 *
 * Vérifie que `?type=A&type=B` (multi) et `?type=A` (single) fonctionnent,
 * et que les valeurs invalides sont silencieusement ignorées.
 */
import { NextRequest } from 'next/server'
import { GET } from '@/app/api/opportunites/route'

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

const mockListOpportunites = jest.fn()
jest.mock('@/lib/opportunites-loader', () => ({
  listOpportunites: (filtres: unknown) => mockListOpportunites(filtres),
}))

describe('GET /api/opportunites — multi-select GUIC-256', () => {
  beforeEach(() => {
    mockListOpportunites.mockReset()
    mockListOpportunites.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    })
  })

  function buildRequest(query: string): NextRequest {
    return new NextRequest(`http://localhost:3000/api/opportunites?${query}`)
  }

  it('rétro-compat — ?type=Emploi (single) → loader reçoit type: "Emploi"', async () => {
    await GET(buildRequest('type=Emploi'))
    const filtres = mockListOpportunites.mock.calls[0][0]
    expect(filtres.type).toBe('Emploi')
  })

  it('multi-select — ?type=Emploi&type=Stage → loader reçoit type: ["Emploi","Stage"]', async () => {
    await GET(buildRequest('type=Emploi&type=Stage'))
    const filtres = mockListOpportunites.mock.calls[0][0]
    expect(filtres.type).toEqual(['Emploi', 'Stage'])
  })

  it('multi-select domaine — ?domaine=Numerique&domaine=Agriculture', async () => {
    await GET(buildRequest('domaine=Numerique&domaine=Agriculture'))
    const filtres = mockListOpportunites.mock.calls[0][0]
    expect(filtres.domaine).toEqual(['Numerique', 'Agriculture'])
  })

  it('valeur invalide silencieusement ignorée — ?type=Emploi&type=NotAType', async () => {
    await GET(buildRequest('type=Emploi&type=NotAType'))
    const filtres = mockListOpportunites.mock.calls[0][0]
    expect(filtres.type).toBe('Emploi')
  })

  it('aucun filtre → loader reçoit undefined sur les 3 champs', async () => {
    await GET(buildRequest(''))
    const filtres = mockListOpportunites.mock.calls[0][0]
    expect(filtres.type).toBeUndefined()
    expect(filtres.domaine).toBeUndefined()
    expect(filtres.region).toBeUndefined()
  })

  it('combine multi-select sur les 3 dimensions', async () => {
    await GET(buildRequest('type=Emploi&type=Stage&domaine=Numerique&domaine=Agriculture&region=Dakar&region=Thies'))
    const filtres = mockListOpportunites.mock.calls[0][0]
    expect(filtres.type).toEqual(['Emploi', 'Stage'])
    expect(filtres.domaine).toEqual(['Numerique', 'Agriculture'])
    expect(filtres.region).toEqual(['Dakar', 'Thies'])
  })
})
