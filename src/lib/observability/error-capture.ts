// GUIC-578 — Capture centrale des erreurs de requête.
//
// Appelée par le hook `onRequestError` de Next (instrumentation.ts). Avant ce socle, une erreur
// 500 n'était journalisée nulle part de façon fiable. Ici : UNE entrée de log structurée par
// erreur, corrélée par requestId, exploitable par Grafana (`level=error`).
//
// CDP : on ne journalise que des métadonnées sûres — jamais les en-têtes bruts (cookies, jeton
// d'autorisation), jamais de corps de requête, jamais de PII en clair.

import { logger } from '@/lib/logger'
import { resolveRequestId } from './request-id'

/** Sous-ensemble sûr des infos de requête fournies par Next à `onRequestError`. */
export interface RequestErrorInfo {
  method?: string
  path?: string
  headers: Headers
}

/** Contexte de routage fourni par Next (route/page, chemin, type). */
export interface ErrorRoutingContext {
  routePath?: string
  routeType?: string
  routerKind?: string
}

/** Longueur max de la trace journalisée (évite les logs géants). */
const MAX_STACK = 4096

export function captureRequestError(
  error: unknown,
  info: RequestErrorInfo,
  context: ErrorRoutingContext,
): void {
  const requestId = resolveRequestId(info.headers)

  let message: string
  let stack: string | undefined
  if (error instanceof Error) {
    message = error.message
    stack = error.stack?.slice(0, MAX_STACK)
  } else {
    message = String(error).slice(0, MAX_STACK)
  }

  logger.error('request_error', {
    requestId,
    method: info.method,
    path: info.path,
    routePath: context.routePath,
    routeType: context.routeType,
    error: message,
    ...(stack ? { stack } : {}),
  })
}
