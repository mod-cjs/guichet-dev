// GUIC-712 — Porte du consentement pour les traceurs.
//
// Tout script de mesure d'audience passe par ici. Le balayage de
// `tests/unit/consent-garde-traceurs.test.ts` interdit d'en nommer un ailleurs : c'est
// ce qui empêche la règle de dépendre de la mémoire de qui écrit le code.

import { categorieAcceptee, type Consentement } from './cookies'

/**
 * Vrai si un traceur de mesure d'audience peut être chargé.
 *
 * Refus par défaut, dans les deux dimensions. Sans consentement courant, rien ne part —
 * c'est la définition d'un opt-in. Sans identifiant configuré non plus : consentir
 * n'invente pas d'outil, et charger sur la seule foi d'un accord ferait exister une
 * collecte que rien ne réalise.
 */
export function traceurAutorise(
  consentement: Consentement | null,
  identifiant: string | undefined,
): boolean {
  if (!identifiant || identifiant.trim() === '') return false
  return categorieAcceptee(consentement, 'mesure_audience')
}
