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

// GUIC-689 — la route résout désormais le DNS de l'URL amont (garde anti-SSRF).
// Sans ce mock, la garde interroge le réseau pour un hôte de fixture, échoue
// fermé, et TOUS ces tests renvoient 502. On simule un hôte public valide :
// le comportement anti-SSRF a sa propre suite (`ressource-proxy-ssrf`).
jest.mock('@/lib/curation/robot/ssrf-guard', () => ({
  ipPubliqueValidee: jest.fn().mockResolvedValue('93.184.216.34'),
  estIpInterne: jest.fn().mockReturnValue(false),
}))

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

/**
 * GUIC-689 (F-5) — chaque branche d'erreur du proxy doit rester « frame-friendly » :
 * `PdfViewer` embed la réponse de CETTE route dans une <iframe> same-origin. Si une
 * branche d'erreur ne réémet pas l'override `frame-ancestors 'self'`, elle hérite du
 * `frame-ancestors 'none'` global de `next.config.ts` (`headers()` s'applique via
 * `res.setHeader` AVANT le handler ; seul un header explicitement reposé par la route
 * le remplace) → violation CSP côté navigateur quand l'iframe pointe vers l'erreur.
 */
describe('GET /api/ressources/[id]/proxy — réponses d\'erreur propres et frame-friendly', () => {
  it('source distante injoignable (502) → JSON propre, jamais de HTML framable', async () => {
    mockFindFirst.mockResolvedValue({ url: 'https://x/doc.pdf', type: 'PDF', titre: 'Doc' })
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch
    const res = await GET(req(), { params })
    expect(res.status).toBe(502)
    expect(res.headers.get('content-type')).toContain('json')
  })

  it('502 amont → override CSP frame-ancestors self (pas le \'none\' global qui bloquerait l\'iframe)', async () => {
    mockFindFirst.mockResolvedValue({ url: 'https://x/doc.pdf', type: 'PDF', titre: 'Doc' })
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch
    const res = await GET(req(), { params })
    expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'")
    expect(res.headers.get('Content-Security-Policy')).not.toContain("frame-ancestors 'none'")
    expect(res.headers.get('X-Frame-Options')).toBe('SAMEORIGIN')
  })

  it('ressource introuvable (404) → JSON propre + headers frame-friendly', async () => {
    mockFindFirst.mockResolvedValue(null)
    const res = await GET(req(), { params })
    expect(res.status).toBe(404)
    expect(res.headers.get('content-type')).toContain('json')
    expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'")
  })

  it('415 (source pas un PDF) → headers frame-friendly également', async () => {
    mockFindFirst.mockResolvedValue({ url: 'https://x/page', type: 'PDF', titre: 'Doc' })
    global.fetch = jest.fn().mockResolvedValue(fakeUpstream('text/html; charset=utf-8')) as unknown as typeof fetch
    const res = await GET(req(), { params })
    expect(res.status).toBe(415)
    expect(res.headers.get('Content-Security-Policy')).toContain("frame-ancestors 'self'")
  })
})
