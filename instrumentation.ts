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

import type { RequestErrorInfo, ErrorRoutingContext } from '@/lib/observability/error-capture'

// ⚠️ Next compile CE FICHIER POUR LES DEUX RUNTIMES (Node ET Edge). Nos modules tirent
// `logger` → `import { createHash } from 'crypto'`, un builtin Node INDISPONIBLE en Edge
// (« A Node.js module is loaded ('crypto') which is not supported in the Edge Runtime »).
// D'où les imports DYNAMIQUES gardés par `NEXT_RUNTIME` : le bundle Edge ne les embarque pas.

/** GUIC-564 — Appelé une fois au boot. Lève si la config exposerait la connexion sans SSO. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { assertConfigurationProduction } = await import('@/lib/security/prod-guards')
  assertConfigurationProduction(process.env)
}

/** GUIC-578 — Appelé par Next pour toute erreur non gérée d'un handler (route/page). */
export async function onRequestError(
  error: unknown,
  request: RequestErrorInfo,
  context: ErrorRoutingContext,
): Promise<void> {
  // Edge : on ne peut pas charger le logger (crypto). On laisse Next journaliser l'erreur
  // nativement plutôt que de casser le bundle — la capture structurée couvre le runtime Node,
  // où vivent les routes API et le rendu serveur (l'essentiel des 500).
  if (process.env.NEXT_RUNTIME !== 'nodejs') return
  const { captureRequestError } = await import('@/lib/observability/error-capture')
  captureRequestError(error, request, context)
}
