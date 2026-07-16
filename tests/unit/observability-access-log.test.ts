/**
 * @jest-environment node
 *
 * GUIC-578 — Log d'accès applicatif (withObservability).
 *
 * Enveloppe un handler de route pour produire UNE ligne de log par requête : méthode, chemin,
 * statut, latence, requestId, uid HACHÉ (jamais brut — CDP). C'est ce qui rend le taux de 5xx
 * et la latence calculables. En cas d'exception, on logue puis on relance (l'erreur remonte à
 * `onRequestError` pour la trace complète).
 */
const mockInfo = jest.fn()
const mockError = jest.fn()

/**
 * GUIC-617 — Le faux hash ne DOIT PAS recopier son entrée.
 *
 * L'ancien mock était `(s) => \`h(${s})\`` : le faux « haché » CONTENAIT l'uid en clair, ce qui
 * contredisait l'assertion du test lui-même (« l'uid n'apparaît jamais en clair ») et le rendait
 * rouge en permanence. Un test de conformité CDP rouge par construction est pire qu'absent : le
 * jour où il a raison, plus personne ne l'écoute. Le vrai `hashId` hache bien : il n'y a jamais
 * eu de fuite. Ici on imite un VRAI hash — sortie stable, sans lien lisible avec l'entrée.
 */
const mockHashId = jest.fn((s: string) => `sha256:${s.length}`)
jest.mock('@/lib/logger', () => ({
  logger: { info: (...a: unknown[]) => mockInfo(...a), error: (...a: unknown[]) => mockError(...a) },
  hashId: (s: string) => mockHashId(s),
}))

import { withObservability } from '@/lib/observability/access-log'

function req(method = 'GET', url = 'http://localhost/api/opportunites?x=1', reqId = 'rid-1') {
  return new Request(url, { method, headers: { 'x-request-id': reqId } })
}

beforeEach(() => jest.clearAllMocks())

describe('GUIC-578 — withObservability', () => {
  it('journalise une ligne d’accès avec méthode, chemin, statut, latence, requestId', async () => {
    const handler = withObservability(async () => new Response('ok', { status: 200 }))
    const res = await handler(req())
    expect(res.status).toBe(200)
    expect(mockInfo).toHaveBeenCalledTimes(1)
    const [, ctx] = mockInfo.mock.calls[0]
    expect(ctx).toMatchObject({ method: 'GET', path: '/api/opportunites', status: 200, requestId: 'rid-1' })
    expect(typeof ctx.durationMs).toBe('number')
  })

  it('écho du requestId dans l’en-tête de réponse', async () => {
    const handler = withObservability(async () => new Response('ok'))
    const res = await handler(req('GET', 'http://localhost/x', 'rid-echo'))
    expect(res.headers.get('x-request-id')).toBe('rid-echo')
  })

  it('journalise le statut 4xx/5xx renvoyé par le handler', async () => {
    const handler = withObservability(async () => new Response('nope', { status: 503 }))
    await handler(req())
    expect(mockInfo.mock.calls[0][1]).toMatchObject({ status: 503 })
  })

  it('sur exception : logue un accès en statut 500 PUIS relance (trace via onRequestError)', async () => {
    const boom = new Error('boom')
    const handler = withObservability(async () => {
      throw boom
    })
    await expect(handler(req())).rejects.toBe(boom)
    // une ligne d'accès en 500 est quand même émise
    const call = mockInfo.mock.calls[0] ?? mockError.mock.calls[0]
    expect(call?.[1]).toMatchObject({ status: 500 })
  })

  it('CDP : l’uid n’apparaît JAMAIS en clair (haché via hashId)', async () => {
    const handler = withObservability(async () => new Response('ok'), { cjsUid: () => 'uid-secret' })
    await handler(req())
    const ctx = mockInfo.mock.calls[0][1]
    // 1. l'uid brut est bien passé à la fonction de hachage…
    expect(mockHashId).toHaveBeenCalledWith('uid-secret')
    // 2. …et c'est le RÉSULTAT du hachage qui est journalisé…
    expect(ctx.uid).toBe('sha256:10')
    // 3. …l'uid brut n'apparaît nulle part dans la ligne de log (l'assertion qui compte).
    expect(JSON.stringify(ctx)).not.toContain('uid-secret')
  })

  it('CDP : sans extracteur cjsUid, aucun champ uid n’est journalisé', async () => {
    const handler = withObservability(async () => new Response('ok'))
    await handler(req())
    expect(mockInfo.mock.calls[0][1]).not.toHaveProperty('uid')
    expect(mockHashId).not.toHaveBeenCalled()
  })
})
