import { Agent } from 'undici'
import { ipPubliqueValidee, estIpInterne, type Resolver } from './ssrf-guard'

/**
 * GUIC-597 — US-2 : client HTTP du robot. Seam injectable : vrai `fetch` en prod,
 * fixtures en test. Durcissement (revue adverse 2026-07-20) :
 *  - Anti-SSRF SANS TOCTOU : on résout UNE fois, on valide l'IP, puis on ÉPINGLE cette IP
 *    pour la connexion (dispatcher undici) → pas de re-résolution exploitable (rebinding).
 *  - Corps LU EN STREAMING avec plafond dur (pas d'`arrayBuffer()` complet → pas d'OOM),
 *    plus refus si `Content-Length` annoncé dépasse le cap.
 *  - Redirections : une seule redirection suivie, cible RE-VALIDÉE anti-SSRF.
 *  - 1 retry sur erreur transitoire (réseau / 5xx / timeout).
 */

export interface ReponseHttp {
  statut: number
  corps: string
  contentType: string | null
}

/** Options par requête. `accept` : négociation de contenu configurée par la source (fix #4). */
export interface OptionsRequete {
  accept?: string
}

export type ClientHttp = (url: string, opts?: OptionsRequete) => Promise<ReponseHttp>

/** En-tête Accept par défaut : négociation large (flux d'abord, HTML en repli). */
export const ACCEPT_DEFAUT = 'application/rss+xml, application/xml, text/html;q=0.9, */*;q=0.5'

export const USER_AGENT_ROBOT = 'CJSGuichetBot/1.0 (+https://guichetjeunesse.sn)'

export class UrlInterditeError extends Error {
  constructor(url: string) {
    super(`URL refusée (SSRF/hôte interne) : ${url}`)
    this.name = 'UrlInterditeError'
  }
}

export interface OptionsClientReel {
  userAgent?: string
  timeoutMs?: number
  tailleMaxOctets?: number
  maxRedirections?: number
  resolver?: Resolver
  /** Injection du transport bas niveau (tests). Défaut : `fetch` global. */
  fetchImpl?: typeof fetch
}

/**
 * `lookup` undici épinglé : renvoie TOUJOURS l'IP déjà validée, en IGNORANT le hostname —
 * c'est la parade DNS-rebinding (undici ne re-résout jamais au moment de la connexion).
 * Exporté pour être testable directement (le vrai mécanisme anti-rebinding).
 */
export function lookupEpingle(ip: string) {
  const family = ip.includes(':') ? 6 : 4
  return (_hostname: string, _opts: unknown, cb: (err: Error | null, addr: unknown) => void) =>
    cb(null, [{ address: ip, family }])
}

/** Dispatcher undici qui force la connexion sur une IP déjà validée (anti-rebinding). */
function dispatcherEpingle(ip: string): Agent {
  return new Agent({ connect: { lookup: lookupEpingle(ip) as never } })
}

const estTransitoire = (statut: number) => statut === 0 || statut >= 500

async function lireBorne(res: Response, tailleMax: number): Promise<string> {
  const cl = Number(res.headers.get('content-length'))
  if (Number.isFinite(cl) && cl > tailleMax) throw new Error('Réponse trop volumineuse (Content-Length)')
  if (!res.body) return ''
  const reader = res.body.getReader()
  const morceaux: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > tailleMax) {
      await reader.cancel().catch(() => {})
      break // plafond dur : on arrête de bufferiser
    }
    morceaux.push(value)
  }
  return new TextDecoder('utf-8').decode(concat(morceaux))
}

function concat(morceaux: Uint8Array[]): Uint8Array {
  const total = morceaux.reduce((a, m) => a + m.byteLength, 0)
  const out = new Uint8Array(total)
  let o = 0
  for (const m of morceaux) {
    out.set(m, o)
    o += m.byteLength
  }
  return out
}

export function clientHttpReel(opts: OptionsClientReel = {}): ClientHttp {
  const userAgent = opts.userAgent ?? USER_AGENT_ROBOT
  const timeoutMs = opts.timeoutMs ?? 10_000
  const tailleMax = opts.tailleMaxOctets ?? 2_000_000
  const maxRedirs = opts.maxRedirections ?? 1
  const resolver = opts.resolver
  const doFetch = opts.fetchImpl ?? fetch

  async function unFetch(url: string, accept?: string): Promise<ReponseHttp> {
    let cible = url
    for (let saut = 0; saut <= maxRedirs; saut++) {
      const ip = await ipPubliqueValidee(cible, resolver)
      if (!ip) throw new UrlInterditeError(cible)

      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), timeoutMs)
      // Dispatcher épinglé créé par requête → refermé en finally (pas de fuite de sockets).
      const dispatcher = opts.fetchImpl ? undefined : dispatcherEpingle(ip)
      try {
        const res = await doFetch(cible, {
          method: 'GET',
          redirect: 'manual', // on gère la redirection nous-mêmes (revalidation SSRF)
          signal: ctrl.signal,
          headers: { 'user-agent': userAgent, accept: accept || ACCEPT_DEFAUT },
          // @ts-expect-error dispatcher (undici) non typé sur le fetch DOM
          dispatcher,
        })

        // Redirection : suivre une fois, cible re-validée au tour suivant.
        if (res.status >= 300 && res.status < 400 && saut < maxRedirs) {
          const loc = res.headers.get('location')
          if (loc) {
            cible = new URL(loc, cible).toString()
            continue
          }
        }
        const corps = await lireBorne(res, tailleMax)
        return { statut: res.status, corps, contentType: res.headers.get('content-type') }
      } finally {
        clearTimeout(timer)
        void dispatcher?.destroy() // libère le pool de sockets keep-alive
      }
    }
    throw new Error(`Trop de redirections : ${url}`)
  }

  return async (url: string, reqOpts?: OptionsRequete): Promise<ReponseHttp> => {
    try {
      const r = await unFetch(url, reqOpts?.accept)
      if (estTransitoire(r.statut)) throw new Error(`HTTP ${r.statut}`)
      return r
    } catch (err) {
      if (err instanceof UrlInterditeError) throw err
      // 1 retry sur erreur transitoire (réseau / timeout / 5xx).
      return unFetch(url, reqOpts?.accept)
    }
  }
}

// Ré-export pour les appelants qui veulent classer une IP.
export { estIpInterne }
