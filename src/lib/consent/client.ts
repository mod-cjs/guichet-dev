// GUIC-712 — Lecture et écriture de la décision côté navigateur.
//
// Séparé de `cookies.ts` (pur) et de `server.ts` (`next/headers`) : c'est le seul module
// des trois qui touche `document`, donc le seul qui ne peut pas s'exécuter au rendu
// serveur.

import {
  COOKIE_CONSENTEMENT,
  DUREE_CONSENTEMENT_JOURS,
  decoderConsentement,
  encoderConsentement,
  type Consentement,
} from './cookies'

/** Décision enregistrée dans ce navigateur, ou null si rien n'a été décidé. */
export function lireConsentementNavigateur(): Consentement | null {
  if (typeof document === 'undefined') return null

  // Découpe explicite plutôt qu'une expression régulière sur toute la chaîne : un cookie
  // voisin dont la VALEUR contient `cjs_consent` ne doit pas être pris pour le nôtre.
  const paire = document.cookie
    .split('; ')
    .find((morceau) => morceau.startsWith(`${COOKIE_CONSENTEMENT}=`))

  if (!paire) return null
  return decoderConsentement(paire.slice(COOKIE_CONSENTEMENT.length + 1))
}

/** Persiste la décision pour la durée déclarée. */
export function ecrireConsentementNavigateur(consentement: Consentement): void {
  if (typeof document === 'undefined') return

  const attributs = [
    `${COOKIE_CONSENTEMENT}=${encoderConsentement(consentement)}`,
    'path=/',
    `max-age=${DUREE_CONSENTEMENT_JOURS * 86_400}`,
    // Lax et non Strict : le retour du SSO est une navigation cross-site, et un cookie
    // Strict ne serait pas renvoyé sur ce premier aller — le bandeau réapparaîtrait
    // juste après la connexion, alors que l'utilisateur vient de se prononcer.
    'SameSite=Lax',
  ]

  // Pas de `Secure` en développement : le cookie serait refusé sur http://localhost et
  // la décision ne survivrait à aucun rechargement.
  if (window.location.protocol === 'https:') attributs.push('Secure')

  document.cookie = attributs.join('; ')
}
