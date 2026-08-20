// GUIC-712 — Lecture de la décision côté serveur.
//
// Séparé de `client.ts` : `next/headers` n'existe pas dans le bundle navigateur, et un
// import croisé ferait échouer le build du bandeau ('use client').

import { cookies } from 'next/headers'
import { COOKIE_CONSENTEMENT, decoderConsentement, type Consentement } from './cookies'

/**
 * Décision portée par la requête courante, ou null.
 *
 * C'est cette lecture qui permet de NE PAS émettre un script plutôt que de l'émettre
 * puis de le neutraliser côté client — neutraliser après coup laisserait le dépôt avoir
 * lieu, ce qui est précisément ce que le consentement doit conditionner.
 */
export async function lireConsentement(): Promise<Consentement | null> {
  const pot = await cookies()
  return decoderConsentement(pot.get(COOKIE_CONSENTEMENT)?.value)
}
