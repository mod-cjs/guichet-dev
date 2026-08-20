// GUIC-712 — Lecture de la décision côté serveur.
//
// CONTRAT — implémentation à venir (commit GREEN).

import type { Consentement } from './cookies'

/** Décision portée par la requête courante, ou null. */
export async function lireConsentement(): Promise<Consentement | null> {
  throw new Error('non implémenté')
}
