// Instrumentation Next — DEUX hooks indépendants, tous deux indispensables en production.
//
//   register()        (GUIC-564) : refuse le DÉMARRAGE sur une configuration dangereuse
//                                  (ex. connexion sans SSO activable sur une URL publique).
//   onRequestError()  (GUIC-578) : capture CENTRALE des erreurs — toute 500 non gérée devient
//                                  une entrée de log structurée, corrélée par requestId.
//
// ⚠️ Ce fichier a DÉJÀ été cassé par un merge (#250 + #254 : le corps de l'un inséré DANS la
// fonction de l'autre → accolade manquante → module non parsable → les DEUX garde-fous morts
// EN SILENCE, et CI rouge). Si tu résous un conflit ici : garde les DEUX exports, imports EN
// TÊTE, et vérifie avec `npx tsc --noEmit` SANS filtrer la sortie.

import { assertConfigurationProduction } from '@/lib/security/prod-guards'
import {
  captureRequestError,
  type RequestErrorInfo,
  type ErrorRoutingContext,
} from '@/lib/observability/error-capture'

/** GUIC-564 — Appelé une fois au boot. Lève si la config exposerait la connexion sans SSO. */
export function register(): void {
  assertConfigurationProduction(process.env)
}

/** GUIC-578 — Appelé par Next pour toute erreur non gérée d'un handler (route/page). */
export function onRequestError(
  error: unknown,
  request: RequestErrorInfo,
  context: ErrorRoutingContext,
): void {
  captureRequestError(error, request, context)
}
