/**
 * M13 / Data Hub — validation de la borne `since` (lot 3, spec §8.1).
 *
 * Partagée par `[stream]/route.ts` et `counts/route.ts` : deux implémentations de la même
 * validation auraient fini par diverger — c'est exactement le défaut qui laissait `[stream]`
 * rendre 500 sur une borne illisible pendant que `counts` rendait déjà 400 pour la même
 * entrée (GUIC-696 S3).
 *
 * Deux refus, tous deux nets plutôt que silencieux :
 *  - illisible (`Date.parse` échoue) ;
 *  - hors plage MariaDB DATETIME (an 1000 à 9999). Une date comme `+275760-09-13` est un
 *    `Date` JavaScript parfaitement légal, mais un `WHERE updated_at >= ...` posé avec cette
 *    valeur ne filtre plus rien côté MySQL : l'API rendait 200 avec les premières lignes du
 *    flux, comme si `since` n'avait jamais été fourni (GUIC-696 S2).
 */
export class BadSinceError extends Error {
  constructor(raison: string) {
    super(`Paramètre since invalide : ${raison}`)
    this.name = 'BadSinceError'
  }
}

const ANNEE_MIN = 1000
const ANNEE_MAX = 9999

export function parseSince(raw: string | null): Date | null {
  if (raw === null) return null

  const ms = Date.parse(raw)
  if (Number.isNaN(ms)) {
    throw new BadSinceError(`illisible : ${raw}`)
  }

  const date = new Date(ms)
  const annee = date.getUTCFullYear()
  if (annee < ANNEE_MIN || annee > ANNEE_MAX) {
    throw new BadSinceError(
      `hors plage MariaDB DATETIME (${ANNEE_MIN}-${ANNEE_MAX}) : ${raw}`
    )
  }

  return date
}
