/**
 * @jest-environment node
 *
 * Tests `GET /api/centres/[slug]` (Wave 3 / GUIC-357).
 */

const mockRateLimit = jest.fn().mockResolvedValue(null)
jest.mock('@/lib/rate-limit', () => ({
  rateLimit: (...a: unknown[]) => mockRateLimit(...a),
}))

const mockGetCentreBySlug = jest.fn()
jest.mock('@/lib/loaders/centres', () => ({
  getCentreBySlug: (...a: unknown[]) => mockGetCentreBySlug(...a),
}))

import { NextRequest, NextResponse } from 'next/server'
import { GET } from '@/app/api/centres/[slug]/route'

function req(url: string): NextRequest {
  return new NextRequest(new URL(url, 'http://localhost'))
}

const sampleCentre = {
  id: 'c-tamba',
  slug: 'cjs-tambacounda',
  nom: 'CJS Tambacounda',
  region: 'Tambacounda',
  ville: 'Tambacounda',
  adresse: 'Quartier Plateau',
  telephone: '+221339812020',
  email: 'tambacounda@cjs.sn',
  description: null,
  imageUrl: null,
  latitude: 13.77,
  longitude: -13.66,
  services: ['WiFi'],
  conseillersCount: 3,
  isOpen: true,
  openingHoursText: '08:00 - 18:00',
  horaires: [],
  ressources: [],
}

beforeEach(() => {
  jest.clearAllMocks()
  mockRateLimit.mockResolvedValue(null)
})

describe('GET /api/centres/[slug]', () => {
  it('renvoie 200 + { data: { centre } } structure ApiResponse', async () => {
    mockGetCentreBySlug.mockResolvedValue(sampleCentre)
    const r = await GET(req('http://localhost/api/centres/cjs-tambacounda'), {
      params: Promise.resolve({ slug: 'cjs-tambacounda' }),
    })
    expect(r.status).toBe(200)
    const body = await r.json()
    expect(body.data.centre.slug).toBe('cjs-tambacounda')
    expect(body.meta.generated_at).toBeDefined()
  })

  it('renvoie 404 NOT_FOUND si centre inconnu', async () => {
    mockGetCentreBySlug.mockResolvedValue(null)
    const r = await GET(req('http://localhost/api/centres/inconnu'), {
      params: Promise.resolve({ slug: 'inconnu' }),
    })
    expect(r.status).toBe(404)
    const body = await r.json()
    expect(body.error.code).toBe('NOT_FOUND')
  })

  it('inclut un header Cache-Control public-friendly', async () => {
    mockGetCentreBySlug.mockResolvedValue(sampleCentre)
    const r = await GET(req('http://localhost/api/centres/cjs-tambacounda'), {
      params: Promise.resolve({ slug: 'cjs-tambacounda' }),
    })
    expect(r.headers.get('Cache-Control')).toMatch(/s-maxage=60/)
    expect(r.headers.get('Cache-Control')).toMatch(/stale-while-revalidate/)
  })

  it('renvoie 429 si rate-limit déclenche', async () => {
    mockRateLimit.mockResolvedValue(
      NextResponse.json(
        { error: { code: 'RATE_LIMITED', message: 'x' } },
        { status: 429 },
      ),
    )
    const r = await GET(req('http://localhost/api/centres/cjs-tambacounda'), {
      params: Promise.resolve({ slug: 'cjs-tambacounda' }),
    })
    expect(r.status).toBe(429)
    expect(mockGetCentreBySlug).not.toHaveBeenCalled()
  })
})
