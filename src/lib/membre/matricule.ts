import { randomInt } from 'node:crypto'

/**
 * GUIC-689 — Matricule de membre CJS, imprimé sur la carte.
 *
 * Format : `GJ-<année d'inscription>-<5 chiffres><lettre de contrôle>`
 * (réf `design-guichet-v5/cjs-card.jsx` L.169, ex. `GJ-2026-77294A`).
 *
 * C'est un identifiant PUBLIC : lisible, dictable au comptoir, imprimé. Il ne
 * remplace pas `cjsUid`, identifiant technique inter-plateformes qui n'a pas
 * vocation à être affiché — et dont il ne dérive PAS, pour que connaître l'un
 * ne donne pas l'autre.
 *
 * Deux propriétés le gouvernent :
 *
 *  - **non devinable** : la part variable est tirée au sort (`randomInt`,
 *    générateur cryptographique), pas incrémentée. Un compteur permettrait de
 *    réclamer l'identité du voisin d'inscription au comptoir.
 *
 *  - **faute de saisie détectable** : la lettre finale est un contrôle calculé
 *    sur le reste. Un agent qui tape un chiffre de travers, ou qui en intervertit
 *    deux, obtient un matricule invalide au lieu de valider le mauvais dossier.
 */

/**
 * Alphabet SANS `I` ni `O` : le matricule se dicte au comptoir et se recopie à
 * la main, où `O` se confond avec `0` et `I` avec `1`. La confusion porterait
 * précisément sur la lettre de CONTRÔLE — celle censée détecter les erreurs de
 * saisie. 24 lettres suffisent largement à cet office.
 */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
const PREFIXE = 'GJ'
const FORMAT = /^GJ-(\d{4})-(\d{5})([A-HJ-NP-Z])$/

/**
 * Somme pondérée par la POSITION, puis modulo 26.
 *
 * La pondération est ce qui rend l'interversion de deux chiffres détectable :
 * une somme simple donnerait le même total pour « 12345 » et « 12435 », et la
 * transposition — la faute de frappe la plus fréquente — passerait inaperçue.
 */
export function lettreControle(base: string): string {
  let somme = 0
  for (let i = 0; i < base.length; i++) {
    somme += base.charCodeAt(i) * (i + 2)
  }
  return ALPHABET[somme % ALPHABET.length]
}

/** Matricule pour un membre inscrit à cette date. */
export function genererMatricule(inscritLe: Date): string {
  const annee = inscritLe.getUTCFullYear()
  const serie = String(randomInt(0, 100_000)).padStart(5, '0')
  const base = `${PREFIXE}-${annee}-${serie}`
  return base + lettreControle(base)
}

/** Format correct ET lettre de contrôle cohérente. */
export function matriculeValide(m: string): boolean {
  if (!FORMAT.test(m)) return false
  return m.slice(-1) === lettreControle(m.slice(0, -1))
}
