// GUIC-712 — Lecture et écriture de la décision côté navigateur.
//
// Séparé de `cookies.ts` (pur) et de `server.ts` (`next/headers`) : c'est le seul module
// des trois qui touche `document`, donc le seul qui ne peut pas s'exécuter au rendu
// serveur.
//
// CONTRAT — implémentation à venir (commit GREEN).

import type { Consentement } from './cookies'

/** Décision enregistrée dans ce navigateur, ou null si rien n'a été décidé. */
export function lireConsentementNavigateur(): Consentement | null {
  throw new Error('non implémenté')
}

/** Persiste la décision pour la durée déclarée. */
export function ecrireConsentementNavigateur(_consentement: Consentement): void {
  throw new Error('non implémenté')
}
