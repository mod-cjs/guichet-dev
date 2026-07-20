import { urlFetchable } from './ssrf-guard'

/**
 * GUIC-597 — US-2 : client HTTP du robot. Seam injectable : le vrai `fetch` en prod
 * (avec garde anti-SSRF, user-agent identifiable, timeout et plafond de taille),
 * remplacé par des fixtures dans les tests. On teste ainsi le vrai parsing/orchestration
 * sans dépendre du réseau.
 */

export interface ReponseHttp {
  statut: number
  corps: string
  contentType: string | null
}

export type ClientHttp = (url: string) => Promise<ReponseHttp>

export const USER_AGENT_ROBOT = 'CJSGuichetBot/1.0 (+https://guichetjeunesse.sn)'

export interface OptionsClientReel {
  userAgent?: string
  timeoutMs?: number
  tailleMaxOctets?: number
}

/** Erreur levée quand une URL est refusée par la garde anti-SSRF. */
export class UrlInterditeError extends Error {
  constructor(url: string) {
    super(`URL refusée (SSRF/hôte interne) : ${url}`)
    this.name = 'UrlInterditeError'
  }
}

export function clientHttpReel(opts: OptionsClientReel = {}): ClientHttp {
  const userAgent = opts.userAgent ?? USER_AGENT_ROBOT
  const timeoutMs = opts.timeoutMs ?? 10_000
  const tailleMax = opts.tailleMaxOctets ?? 2_000_000

  return async (url: string): Promise<ReponseHttp> => {
    // Garde anti-SSRF au fetch (parade DNS-rebinding).
    if (!(await urlFetchable(url))) throw new UrlInterditeError(url)

    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await fetch(url, {
        method: 'GET',
        redirect: 'manual', // une redirection pourrait pointer vers un hôte interne non re-gardé
        signal: ctrl.signal,
        headers: { 'user-agent': userAgent, accept: 'application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.5' },
      })
      // Lecture bornée : on tronque au-delà du plafond pour éviter le gonflage mémoire.
      const buf = await res.arrayBuffer()
      const octets = buf.byteLength > tailleMax ? buf.slice(0, tailleMax) : buf
      const corps = new TextDecoder('utf-8').decode(octets)
      return { statut: res.status, corps, contentType: res.headers.get('content-type') }
    } finally {
      clearTimeout(timer)
    }
  }
}
