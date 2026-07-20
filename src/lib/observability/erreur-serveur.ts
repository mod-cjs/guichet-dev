// GUIC-574 — Réponse 5xx observable.
//
// `instrumentation.ts` (hook `onRequestError`) capture les exceptions NON GÉRÉES. Mais un
// `return NextResponse.json(…, { status: 500 })` dans un `catch` ne lève pas : le hook ne le voit
// pas. Mesuré avant d'écrire ce module : 44 retours 5xx dans 42 fichiers, dont **33 journalisés
// nulle part**. Le proxy voit bien passer le statut — ils comptent donc dans le taux d'erreur —
// mais SANS la cause. On détecte l'incident sans pouvoir le diagnostiquer.
//
// Ce helper rend le log INSÉPARABLE de la réponse : on ne peut plus renvoyer un 5xx muet.
//
// Il fixe aussi la règle qui compte pour la CDP et la sécurité : **le détail va dans le LOG,
// jamais au client**. Une chaîne comme « connect ECONNREFUSED 10.0.0.5:3306 — user guichet »
// renseigne un attaquant sur la topologie interne ; elle n'a rien à faire dans une réponse HTTP.

import { NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { scrubPath, scrubMessage } from './scrub'
import type { ApiResponse } from '@/types/api'

export interface ErreurServeurParams {
  /** Code machine stable, journalisé et renvoyé au client (ex. `INTERNAL_ERROR`). */
  code:       string
  /** Statut 5xx (défaut 500). */
  status?:    number
  /** Message destiné au CLIENT. Générique — jamais de détail d'implémentation. */
  message?:   string
  /** Cause réelle : journalisée, JAMAIS renvoyée au client. */
  cause?:     unknown
  /** Chemin de la requête (neutralisé des identifiants avant journalisation). */
  route?:     string
  /** Identifiant de corrélation, pour recouper avec le log du proxy. */
  requestId?: string
}

/** Message par défaut : utile à l'utilisateur, muet sur l'implémentation. */
const MESSAGE_GENERIQUE = 'Erreur interne — réessaye dans un instant.'

/** Extrait un texte diagnostique de la cause, quelle que soit sa forme. */
function texteCause(cause: unknown): string | undefined {
  if (cause === undefined || cause === null) return undefined
  if (cause instanceof Error) return cause.stack ?? cause.message
  return typeof cause === 'string' ? cause : JSON.stringify(cause)
}

/**
 * Journalise une erreur serveur ET renvoie la réponse 5xx correspondante.
 *
 * @throws si `status` n'est pas un 5xx — ce helper ne sert QU'AUX pannes. L'employer pour un 4xx
 *   rendrait le taux d'erreur ininterprétable : un 404 ou un 403 n'est pas un incident, c'est le
 *   fonctionnement normal d'une API.
 */
export function erreurServeur(params: ErreurServeurParams): NextResponse<ApiResponse<never>> {
  const status = params.status ?? 500
  if (status < 500 || status > 599) {
    throw new Error(
      `erreurServeur : statut ${status} hors 5xx. Ce helper ne journalise que les PANNES ; ` +
        'un 4xx est un fonctionnement normal et fausserait le taux d’erreur.',
    )
  }

  const cause = texteCause(params.cause)
  logger.error('api_5xx', {
    code:   params.code,
    status,
    ...(params.route ? { path: scrubPath(params.route) } : {}),
    ...(params.requestId ? { requestId: params.requestId } : {}),
    // `scrubMessage` retire les e-mails et téléphones qu'une erreur applicative peut charrier.
    ...(cause ? { cause: scrubMessage(cause) } : {}),
  })

  return NextResponse.json<ApiResponse<never>>(
    { error: { code: params.code, message: params.message ?? MESSAGE_GENERIQUE } },
    { status },
  )
}
