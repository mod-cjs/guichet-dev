/**
 * @jest-environment node
 *
 * Tests `GET /api/centres` (Wave 2 / GUIC-353) — pagination + filtre region +
 * rate-limit + structure ApiResponse.
 */

jest.mock('@/lib/rate-limit', () => ({
  rateLimit: jest.fn().mockResolvedValue(null),
}))

const mockGetCentres = jest.fn()
const mockCountCentres = jest.fn()
jest.mock('@/lib/loaders/centres', () => ({
  getCentresWithStatusAndHoraires: (...a: unknown[]) => mockGetCentres(...a),
  countCentres: (...a: unknown[]) => mockCountCentres(...a),
}))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/centres/route'
import { rateLimit } from '@/lib/rate-limit'

function req(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'))
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GET /api/centres', () => {
  it('renvoie data.centres + meta avec total / limit / page', async () => {
    mockGetCentres.mockResolvedValue([{ id: 'a' }, { id: 'b' }])
    mockCountCentres.mockResolvedValue(2)
    const r = await GET(req('http://localhost/api/centres'))
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.data.centres).toHaveLength(2)
    expect(body.meta.total).toBe(2)
    expect(body.meta.limit).toBe(20)
    expect(body.meta.page).toBe(1)
  })

  it('propage le filtre region au loader', async () => {
    mockGetCentres.mockResolvedValue([])
    mockCountCentres.mockResolvedValue(0)
    await GET(req('http://localhost/api/centres?region=Dakar'))
    expect(mockGetCentres).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'Dakar' }),
    )
    expect(mockCountCentres).toHaveBeenCalledWith(
      expect.objectContaining({ region: 'Dakar' }),
    )
  })

  it('plafonne `limit` à 50 si demandé plus haut', async () => {
    mockGetCentres.mockResolvedValue([])
    mockCountCentres.mockResolvedValue(0)
    await GET(req('http://localhost/api/centres?limit=999'))
    const call = mockGetCentres.mock.calls[0][0]
    expect(call.limit).toBe(50)
  })

  it('applique rate-limit (60/min, IP)', async () => {
    mockGetCentres.mockResolvedValue([])
    mockCountCentres.mockResolvedValue(0)
    await GET(req('http://localhost/api/centres'))
    expect(rateLimit).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ max: 60, windowMs: 60_000 }),
    )
  })
})
