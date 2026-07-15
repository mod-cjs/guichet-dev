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
// GUIC-564 — Vérifications au démarrage de l'application.
//
// Next appelle `register()` une fois, au boot du serveur. C'est le seul endroit où l'on peut
// refuser de démarrer sur une configuration dangereuse — plutôt que de servir des requêtes avec
// une porte d'authentification ouverte et de s'en apercevoir trop tard.
//
// (GUIC-578 étendra ce fichier avec le hook `onRequestError` — capture centrale des erreurs.)

import { assertConfigurationProduction } from '@/lib/security/prod-guards'

export function register(): void {
  // Lève si la connexion sans SSO est activable alors que l'URL publique n'est pas locale.
  assertConfigurationProduction(process.env)
}
