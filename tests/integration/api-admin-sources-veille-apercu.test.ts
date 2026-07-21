/**
 * @jest-environment node
 *
 * GUIC-598 — US-3 : aperçu d'extraction admin (coller une URL → voir l'extraction).
 * RBAC admin + garde anti-SSRF + fetch + extraction SANS persistance.
 */
import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { UrlInterditeError } from '@/lib/curation/robot/http-client'

const mockGetSession = jest.fn()
jest.mock('@/lib/auth', () => ({ getSession: (...a: unknown[]) => mockGetSession(...a) }))
// Rate-limit testé séparément (rate-limit.test.ts) ; on le neutralise ici pour éviter un
// flake Redis (20/min sur cjsUid partagé entre POST et re-runs dans la même minute).
jest.mock('@/lib/rate-limit', () => ({ rateLimit: async () => null }))

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
afterAll(async () => {
  await prisma.$disconnect()
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

  it('400 URL invalide / interne (validation statique Zod, en amont du fetch)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    expect((await POST(req({ url: 'http://169.254.169.254/x' }))).status).toBe(400)
    expect((await POST(req({ url: 'pas-une-url' }))).status).toBe(400)
  })

  it('400 URL_INTERDITE : garde SSRF DYNAMIQUE au fetch (rebinding vers IP interne)', async () => {
    // URL au schéma statique valide, mais le client réel refuse au fetch (IP résolue interne).
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    mockClient.mockRejectedValueOnce(new UrlInterditeError('https://rebind.sn/x'))
    const res = await POST(req({ url: 'https://rebind.sn/x' }))
    expect(res.status).toBe(400)
    expect((await res.json()).error.code).toBe('URL_INTERDITE')
  })

  it('422 FETCH_FAILED : la source répond en erreur (non-2xx)', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    mockClient.mockResolvedValueOnce({ statut: 503, corps: '', contentType: null })
    const res = await POST(req({ url: 'https://exemple.sn/ko' }))
    expect(res.status).toBe(422)
    expect((await res.json()).error.code).toBe('FETCH_FAILED')
  })

  it('200 admin : renvoie les champs extraits + score, sans rien persister', async () => {
    mockGetSession.mockResolvedValue({ cjsUid: 'a', roles: ['admin'] })
    const avant = await prisma.itemCuration.count()
    const res = await POST(req({ url: 'https://exemple.sn/offres/1' }))
    expect(res.status).toBe(200)
    const { data } = await res.json()
    expect(data.champs.titre).toBe('Assistant RH')
    expect(data.champs.organisation).toBe('CJS')
    expect(typeof data.scoreCompletude).toBe('number')
    // Non-persistance PROUVÉE : le compteur d'items n'a pas bougé.
    expect(await prisma.itemCuration.count()).toBe(avant)
  })
})
