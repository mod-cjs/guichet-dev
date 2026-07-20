// GUIC-574 — Réponse 5xx observable. SIGNATURE SEULE (commit RED) : l'implémentation arrive au
// commit GREEN. Elle lève pour que les tests échouent sur le COMPORTEMENT manquant, pas sur la
// compilation — `tsc` doit rester vert, sinon le hook pre-commit bloque le commit RED.

import type { NextResponse } from 'next/server'

export interface ErreurServeurParams {
  /** Code machine stable, journalisé et renvoyé au client (ex. `INTERNAL_ERROR`). */
  code:       string
  /** Statut 5xx (défaut 500). */
  status?:    number
  /** Message destiné au CLIENT. Générique — jamais de détail d'implémentation. */
  message?:   string
  /** Cause réelle : journalisée, JAMAIS renvoyée au client. */
  cause?:     unknown
  /** Chemin de la requête (sera neutralisé des identifiants avant journalisation). */
  route?:     string
  /** Identifiant de corrélation, pour recouper avec le log du proxy. */
  requestId?: string
}

export function erreurServeur(_params: ErreurServeurParams): NextResponse {
  throw new Error('erreurServeur : non implémenté (GUIC-574, commit RED)')
}
