/**
 * M13 / Data Hub — dérivations appliquées avant export (lot 3, spec §7.1).
 *
 * Une transformation existe pour une seule raison : permettre l'analyse sans livrer la
 * donnée source. Elle n'est pas un formatage de confort.
 */

/**
 * Tranches d'âge du pilotage jeunesse. Les bornes suivent le découpage du programme YEAH
 * plutôt qu'un quantile statistique : elles doivent rester comparables aux indicateurs
 * publiés par ailleurs.
 */
export type TrancheAge = '-18' | '18-24' | '25-29' | '30-34' | '35+' | 'inconnu'

/**
 * Âge en années révolues à la date de référence, ramené à sa tranche.
 *
 * `dateNaissance` est identifiante et ne sort jamais telle quelle (cf. `CHAMPS_DERIVABLES`).
 * La date de référence est injectable pour que le calcul soit testable : figer « aujourd'hui »
 * dans la fonction rendrait le test dépendant du jour où il s'exécute.
 */
export function trancheAge(
  dateNaissance: Date | null,
  reference: Date = new Date()
): TrancheAge {
  if (dateNaissance === null) return 'inconnu'
  // `Invalid Date` (ex. `0000-00-00`) rend `getTime()` NaN — et TOUTE comparaison avec
  // NaN vaut false, y compris `age < 0` et `age > 120` plus bas : sans ce garde explicite,
  // une date corrompue traverse silencieusement jusqu'au `return '35+'` final (GUIC-696 R3).
  if (Number.isNaN(dateNaissance.getTime())) return 'inconnu'

  let age = reference.getUTCFullYear() - dateNaissance.getUTCFullYear()
  const moisEcoule = reference.getUTCMonth() - dateNaissance.getUTCMonth()
  // Anniversaire non encore passé cette année : on retire l'année entamée.
  if (moisEcoule < 0 || (moisEcoule === 0 && reference.getUTCDate() < dateNaissance.getUTCDate())) {
    age -= 1
  }

  // Une date future ou aberrante ne doit pas produire une tranche fausse mais plausible.
  if (age < 0 || age > 120) return 'inconnu'
  if (age < 18) return '-18'
  if (age < 25) return '18-24'
  if (age < 30) return '25-29'
  if (age < 35) return '30-34'
  return '35+'
}

/** Date seule, sans heure — suffit aux agrégats et réduit la granularité exportée. */
export function jour(value: Date | null): string | null {
  return value === null ? null : value.toISOString().slice(0, 10)
}
