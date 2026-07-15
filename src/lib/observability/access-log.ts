// GUIC-578 — Log d'accès applicatif.
//
// `withObservability` enveloppe un handler de route pour produire UNE ligne de log par requête :
// méthode, chemin, statut, latence, requestId, uid HACHÉ. C'est ce qui rend le taux de 5xx et la
// latence p95 calculables à partir des logs (le proxy fournit le log d'accès GLOBAL ; ce wrapper
// donne la vue applicative sur les routes qu'on choisit d'instrumenter).
//
// CDP : l'uid n'apparaît JAMAIS en clair — toujours via `hashId`.

import { logger, hashId } from '@/lib/logger'
import { resolveRequestId } from './request-id'
import { scrubPath } from './scrub'

/** Un handler de route App Router : reçoit la requête (+ contexte de params), renvoie une réponse. */
type RouteHandler = (request: Request, context?: unknown) => Promise<Response> | Response

export interface ObservabilityOptions {
  /** Extrait le cjs_uid de la requête (sera HACHÉ avant journalisation). Optionnel. */
  cjsUid?: (request: Request) => string | null | undefined
}

/**
 * Enveloppe `handler` : mesure la latence, journalise l'accès, écho du requestId en en-tête de
 * réponse. Sur exception, journalise un accès en statut 500 PUIS relance — l'erreur remonte au
 * hook `onRequestError` (trace complète) et au gestionnaire d'erreurs du framework.
 */
export function withObservability(handler: RouteHandler, opts: ObservabilityOptions = {}): RouteHandler {
  return async (request: Request, context?: unknown): Promise<Response> => {
    const start = Date.now()
    const requestId = resolveRequestId(request.headers)
    const { pathname } = new URL(request.url)
    const uidRaw = opts.cjsUid?.(request)
    const base = {
      requestId,
      method: request.method,
      path: scrubPath(pathname), // CDP (C2) : neutraliser un cjs_uid embarqué dans le chemin
      ...(uidRaw ? { uid: hashId(uidRaw) } : {}),
    }

    try {
      const res = await handler(request, context)
      logger.info('access', { ...base, status: res.status, durationMs: Date.now() - start })
      // Écho du requestId : mutation EN PLACE (C3) — pas de reconstruction de Response, qui
      // risquerait de perturber un flux (streaming) et ferait perdre les specificites NextResponse.
      try {
        if (!res.headers.has('x-request-id')) res.headers.set('x-request-id', requestId)
      } catch {
        /* en-têtes immuables (réponse figée) : on n'echoue pas le log pour ça */
      }
      return res
    } catch (err) {
      logger.info('access', { ...base, status: 500, durationMs: Date.now() - start })
      throw err
    }
  }
}
