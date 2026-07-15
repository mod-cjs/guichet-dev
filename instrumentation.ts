// GUIC-578 — Instrumentation Next : capture centrale des erreurs de requête.
//
// Next appelle `onRequestError` pour toute erreur non gérée d'un handler (route/page). C'est le
// seul point global où une erreur 500 est capturée de façon fiable → on la journalise de façon
// structurée, corrélée par requestId, exploitable par Grafana (`level=error`).
//
// ⚠️ COORDINATION DE MERGE : la PR #250 (GUIC-564) ajoute aussi ce fichier avec un `register()`
// qui refuse le démarrage sur une config dangereuse. Au merge, CONSERVER LES DEUX exports —
// `register` (GUIC-564) ET `onRequestError` (GUIC-578). Ils sont indépendants.

import { captureRequestError, type RequestErrorInfo, type ErrorRoutingContext } from '@/lib/observability/error-capture'

export function onRequestError(
  error: unknown,
  request: RequestErrorInfo,
  context: ErrorRoutingContext,
): void {
  captureRequestError(error, request, context)
}
