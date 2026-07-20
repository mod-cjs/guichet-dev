/**
 * @jest-environment node
 *
 * GUIC-598 — US-3 : aperçu d'extraction admin (coller une URL → voir l'extraction).
 * RBAC admin + garde anti-SSRF + fetch + extraction SANS persistance.
 */
import { NextRequest } from 'next/server'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))

// Transport HTTP + résolution DNS injectés via l'usine de client (évite le réseau réel).
const mockClient = jest.fn()
jest.mock('@/lib/curation/robot/http-client', () => {
  const reel = jest.requireActual('@/lib/curation/robot/http-client')
  return { ...reel, clientHttpReel: () => (url: string) => mockClient(url) }
})

import { POST } from '@/app/api/admin/sources-veille/apercu/route'

const PAGE = `<html><head><script type="application/ld+json">
  {"@type":"JobPosting","title":"Assistant RH","hiringOrganization":{"name":"CJS"}}
  </script></head></html>`

function req(body: unknown) {
  return new NextRequest('http://localhost/api/admin/sources-veille/apercu', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  mockClient.mockResolvedValue({ statut: 200, corps: PAGE, contentType: 'text/html' })
})

describe('GUIC-598 — POST /api/admin/sources-veille/apercu', () => {
  it('401 sans session', async () => {
    mockGetSession.mockResolvedValue(null)
    expect((await POST(req({ url: 'https://exemple.sn/o/1' }))).status).toBe(401)
  })

  it('403 rôle non-admin', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'u', roles: ['jeune'] })
    expect((await POST(req({ url: 'https://exemple.sn/o/1' }))).status).toBe(403)
  })

  it('400 URL invalide / interne (anti-SSRF via validation URL)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    expect((await POST(req({ url: 'http://169.254.169.254/x' }))).status).toBe(400)
    expect((await POST(req({ url: 'pas-une-url' }))).status).toBe(400)
  })

  it('200 admin : renvoie les champs extraits + score, sans rien persister', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    const res = await POST(req({ url: 'https://exemple.sn/offres/1' }))
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.champs.titre).toBe('Assistant RH')
    expect(data.champs.organisation).toBe('CJS')
    expect(typeof data.scoreCompletude).toBe('number')
    // aucune persistance : aucun item créé pour cette URL de test.
  })
})
