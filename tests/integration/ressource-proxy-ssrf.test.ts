/**
 * @jest-environment node
 *
 * GUIC-689 — Le proxy de ressources doit refuser les hôtes internes.
 *
 * `/api/ressources/[id]/proxy` fait un `fetch` sur une URL VENANT DE LA BASE,
 * saisie par un admin, avec `redirect: 'follow'`. Sans garde, le serveur
 * interroge ce qu'on lui indique : métadonnées cloud (169.254.169.254), Redis,
 * MinIO, un service local. Et une URL d'apparence saine peut rediriger vers une
 * adresse interne — la validation statique de l'URL ne suffit donc pas.
 *
 * Le projet dispose déjà de la parade, écrite pour la curation
 * (`src/lib/curation/robot/ssrf-guard.ts`) : résolution DNS, refus si UNE des
 * IP est interne, fail-closed. Elle n'était simplement pas appliquée ici.
 *
 * Deux autres manques couverts : aucun délai maximal (un hôte lent immobilise
 * une connexion) et aucun plafond de taille (le `content-length` était relayé
 * sans être vérifié).
 */
const mockRateLimit = jest.fn().mockResolvedValue(null)
jest.mock('@/lib/rate-limit', () => ({ rateLimit: (...a: unknown[]) => mockRateLimit(...a) }))

const mockFindFirst = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    ressource: { findFirst: (...a: unknown[]) => mockFindFirst(...a), update: jest.fn() },
  },
}))

const mockIpValidee = jest.fn()
jest.mock('@/lib/curation/robot/ssrf-guard', () => ({
  ipPubliqueValidee: (...a: unknown[]) => mockIpValidee(...a),
  estIpInterne: jest.fn(),
}))

import { NextRequest } from 'next/server'

import { GET } from '@/app/api/ressources/[id]/proxy/route'

const req = (url = 'http://localhost/api/ressources/r1/proxy') =>
  new NextRequest(new URL(url), { method: 'GET' })
const ctx = () => ({ params: Promise.resolve({ id: 'r1' }) })

let fetchSpy: jest.SpyInstance

beforeEach(() => {
  jest.clearAllMocks()
  mockRateLimit.mockResolvedValue(null)
  mockFindFirst.mockResolvedValue({ url: 'https://exemple.org/doc.pdf', type: 'PDF', titre: 'Doc' })
  mockIpValidee.mockResolvedValue('93.184.216.34')
  fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
    new Response('%PDF-1.4', {
      status: 200,
      headers: { 'content-type': 'application/pdf', 'content-length': '2048' },
    }),
  )
})

afterEach(() => fetchSpy.mockRestore())

describe('GUIC-689 — anti-SSRF', () => {
  it('un hôte interne est refusé AVANT tout appel réseau', async () => {
    mockIpValidee.mockResolvedValue(null)

    const res = await GET(req(), ctx())

    expect(res.status).toBe(502)
    // Le point essentiel : aucun fetch n'a été tenté.
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('un hôte public passe', async () => {
    const res = await GET(req(), ctx())
    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalled()
  })

  it('la garde est interrogée avec l’URL stockée', async () => {
    await GET(req(), ctx())
    expect(mockIpValidee).toHaveBeenCalledWith('https://exemple.org/doc.pdf')
  })

  it('le message d’erreur ne révèle pas l’URL interne visée', async () => {
    mockIpValidee.mockResolvedValue(null)
    const corps = await (await GET(req(), ctx())).json()
    expect(JSON.stringify(corps)).not.toMatch(/exemple\.org|169\.254|localhost/)
  })
})

describe('GUIC-689 — délai et taille', () => {
  it('le fetch porte un signal d’abandon', async () => {
    await GET(req(), ctx())
    const options = fetchSpy.mock.calls[0][1] as RequestInit
    // Sans lui, un hôte distant lent immobilise une connexion serveur.
    expect(options.signal).toBeDefined()
  })

  it('les redirections ne sont plus suivies aveuglément', async () => {
    await GET(req(), ctx())
    const options = fetchSpy.mock.calls[0][1] as RequestInit
    // `follow` permettait à une URL saine de rediriger vers une adresse interne,
    // hors de portée de la validation faite en amont.
    expect(options.redirect).not.toBe('follow')
  })

  it('UNE redirection est suivie, après revalidation de la cible', async () => {
    // Les CDN redirigent couramment. Passer à `redirect: 'manual'` sans gérer
    // ce cas casserait des ressources qui fonctionnaient.
    fetchSpy
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: 'https://cdn.exemple.org/doc.pdf' } }),
      )
      .mockResolvedValueOnce(
        new Response('%PDF-1.4', {
          status: 200,
          headers: { 'content-type': 'application/pdf' },
        }),
      )

    const res = await GET(req(), ctx())

    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
    // La cible de redirection est repassée par la garde : sans ça, une URL
    // publique redirigeant vers 169.254.169.254 contournerait tout.
    expect(mockIpValidee).toHaveBeenCalledWith('https://cdn.exemple.org/doc.pdf')
  })

  it('une redirection vers un hôte INTERNE est refusée', async () => {
    fetchSpy.mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } }),
    )
    mockIpValidee.mockResolvedValueOnce('93.184.216.34').mockResolvedValueOnce(null)

    const res = await GET(req(), ctx())

    expect(res.status).toBe(502)
    // Un seul appel réseau : la seconde cible n'a jamais été contactée.
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('une chaîne de redirections est refusée — une seule est suivie', async () => {
    fetchSpy
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://a.exemple.org/1' } }))
      .mockResolvedValueOnce(new Response(null, { status: 302, headers: { location: 'https://b.exemple.org/2' } }))

    const res = await GET(req(), ctx())
    expect(res.status).toBe(502)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('un document trop lourd est refusé sur son content-length', async () => {
    fetchSpy.mockResolvedValue(
      new Response('x', {
        status: 200,
        headers: { 'content-type': 'application/pdf', 'content-length': String(200 * 1024 * 1024) },
      }),
    )
    const res = await GET(req(), ctx())
    expect(res.status).toBe(502)
  })
})
