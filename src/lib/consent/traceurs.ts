// GUIC-712 — Porte du consentement pour les traceurs.
//
// CONTRAT — implémentation à venir (commit GREEN).

import type { Consentement } from './cookies'

/** Vrai si un traceur de mesure d'audience peut être chargé. */
export function traceurAutorise(
  _consentement: Consentement | null,
  _identifiant: string | undefined,
): boolean {
  throw new Error('non implémenté')
}
