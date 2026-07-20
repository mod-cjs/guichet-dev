/**
 * @jest-environment node
 *
 * GUIC-597 — US-2 : durcissement du client HTTP réel (revue adverse 2026-07-20).
 * Le transport (`fetchImpl`) et la résolution DNS (`resolver`) sont injectés : on teste
 * la logique jusqu'ici non couverte — redirection re-validée, retry, cap Content-Length,
 * refus anti-SSRF — sans toucher le réseau.
 */
import { clientHttpReel, UrlInterditeError, lookupEpingle } from '@/lib/curation/robot/http-client'

const resolverPublic = async () => ['41.82.10.5']
const resolverInterne = async () => ['169.254.169.254']

function reponse(status: number, corps = '', headers: Record<string, string> = {}) {
  return new Response(corps, { status, headers })
}

describe('GUIC-597 — clientHttpReel durci', () => {
  it('suit UNE redirection et re-valide la cible (anti-SSRF)', async () => {
    const vus: string[] = []
    const fetchImpl = (async (url: string) => {
      vus.push(String(url))
      if (String(url).endsWith('/depart')) {
        return reponse(301, '', { location: 'https://exemple.sn/arrivee' })
      }
      return reponse(200, '<rss></rss>', { 'content-type': 'application/rss+xml' })
    }) as unknown as typeof fetch

    const client = clientHttpReel({ resolver: resolverPublic, fetchImpl })
    const r = await client('https://exemple.sn/depart')
    expect(r.statut).toBe(200)
    expect(r.corps).toContain('rss')
    expect(vus).toHaveLength(2) // départ + arrivée
  })

  it('rejette si la cible de redirection résout vers une IP interne', async () => {
    let appels = 0
    const fetchImpl = (async () => {
      appels++
      return appels === 1
        ? reponse(302, '', { location: 'http://interne.sn/x' })
        : reponse(200, 'ok')
    }) as unknown as typeof fetch
    // La 1re URL est publique, la cible de redirection est interne.
    const resolver = async (h: string) => (h === 'interne.sn' ? ['10.0.0.5'] : ['41.82.10.5'])
    const client = clientHttpReel({ resolver, fetchImpl, maxRedirections: 1 })
    await expect(client('https://exemple.sn/depart')).rejects.toBeInstanceOf(UrlInterditeError)
  })

  it('fait 1 retry sur 503 puis réussit', async () => {
    let appels = 0
    const fetchImpl = (async () => {
      appels++
      return appels === 1 ? reponse(503, 'indispo') : reponse(200, 'ok')
    }) as unknown as typeof fetch
    const client = clientHttpReel({ resolver: resolverPublic, fetchImpl })
    const r = await client('https://exemple.sn/x')
    expect(r.statut).toBe(200)
    expect(appels).toBe(2)
  })

  it('refuse un corps annoncé plus grand que le cap (Content-Length) — message précis', async () => {
    const fetchImpl = (async () =>
      reponse(200, 'x', { 'content-length': '9999999' })) as unknown as typeof fetch
    const client = clientHttpReel({ resolver: resolverPublic, fetchImpl, tailleMaxOctets: 1000 })
    await expect(client('https://exemple.sn/gros')).rejects.toThrow(/volumineuse/i)
  })

  it('borne le corps EN STREAMING quand Content-Length est ABSENT (vraie parade OOM)', async () => {
    // Réponse sans Content-Length, corps > cap → doit être tronqué à la lecture du flux.
    const gros = 'a'.repeat(5000)
    const fetchImpl = (async () =>
      new Response(gros, { status: 200 })) as unknown as typeof fetch
    const client = clientHttpReel({ resolver: resolverPublic, fetchImpl, tailleMaxOctets: 1000 })
    const r = await client('https://exemple.sn/flux')
    expect(r.statut).toBe(200)
    expect(r.corps.length).toBeLessThanOrEqual(1000) // tronqué, pas 5000 → pas d'OOM
  })

  it('ÉPINGLAGE IP (anti-rebinding) : le lookup renvoie l’IP validée en IGNORANT le hostname', () => {
    const lookup = lookupEpingle('41.82.10.5')
    // Quel que soit le hostname passé (rebinding), la connexion cible l'IP épinglée.
    let recu: unknown
    lookup('attacker-rebind.sn', {}, (_e, addr) => (recu = addr))
    expect(recu).toEqual([{ address: '41.82.10.5', family: 4 }])
    let recu6: unknown
    lookupEpingle('::1')('autre.sn', {}, (_e, addr) => (recu6 = addr))
    expect(recu6).toEqual([{ address: '::1', family: 6 }])
  })

  it('refuse d’emblée une URL qui résout vers une IP interne (pas de fetch)', async () => {
    let appels = 0
    const fetchImpl = (async () => {
      appels++
      return reponse(200, 'ne devrait pas être atteint')
    }) as unknown as typeof fetch
    const client = clientHttpReel({ resolver: resolverInterne, fetchImpl })
    await expect(client('https://piege.sn/x')).rejects.toBeInstanceOf(UrlInterditeError)
    expect(appels).toBe(0)
  })
})
