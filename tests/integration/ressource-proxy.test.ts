/**
 * @jest-environment node
 *
 * GUIC-374/366 — proxy ressource : ne sert l'inline QUE si la source est un PDF.
 * Une source non-PDF (lien périmé, page HTML) → 415 → la visionneuse bascule sur
 * son fallback « télécharger / ouvrir ». Le téléchargement explicite reste autorisé.
 */
const mockFindFirst = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { ressource: { findFirst: (...a: unknown[]) => mockFindFirst(...a) } },
}))
jest.mock('@/lib/rate-limit', () => ({ rateLimit: jest.fn().mockResolvedValue(null) }))

import { NextRequest } from 'next/server'
import { GET } from '@/app/api/ressources/[id]/proxy/route'

const params = Promise.resolve({ id: 'r1' })
function req(qs = ''): NextRequest {
  return new NextRequest(new URL(`http://localhost/api/ressources/r1/proxy${qs}`))
}
function fakeUpstream(contentType: string, body = 'data') {
  return {
    ok: true,
    body: new ReadableStream({
      start(c) { c.enqueue(new TextEncoder().encode(body)); c.close() },
    }),
    headers: new Headers({ 'content-type': contentType }),
  }
}

beforeEach(() => jest.clearAllMocks())

describe('GET /api/ressources/[id]/proxy — validation content-type', () => {
  it('source PDF mais content-type HTML (lien périmé) → 415', async () => {
    mockFindFirst.mockResolvedValue({ url: 'https://x/page', type: 'PDF', titre: 'Doc' })
    global.fetch = jest.fn().mockResolvedValue(fakeUpstream('text/html; charset=utf-8')) as unknown as typeof fetch
    const res = await GET(req(), { params })
    expect(res.status).toBe(415)
  })

  it('source = vrai PDF → 200 + content-type pdf', async () => {
    mockFindFirst.mockResolvedValue({ url: 'https://x/doc.pdf', type: 'PDF', titre: 'Doc' })
    global.fetch = jest.fn().mockResolvedValue(fakeUpstream('application/pdf')) as unknown as typeof fetch
    const res = await GET(req(), { params })
    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('pdf')
  })

  it('download=1 d\'une source HTML → 200 (téléchargement explicite autorisé)', async () => {
    mockFindFirst.mockResolvedValue({ url: 'https://x/page', type: 'PDF', titre: 'Doc' })
    global.fetch = jest.fn().mockResolvedValue(fakeUpstream('text/html')) as unknown as typeof fetch
    const res = await GET(req('?download=1'), { params })
    expect(res.status).toBe(200)
  })
})
