interface IdentiteForScore {
  region:        unknown
  commune:       unknown
  genre:         unknown
  dateNaissance: unknown
}

interface ProfilForScore {
  biographie:      unknown
  niveauEtude:     unknown
  situationEmploi: unknown
  domainesInteret: unknown
  competences:     unknown
}

export function calculerScore(
  identite:     IdentiteForScore,
  profil:       ProfilForScore | null,
  expCount:     number,
  diplomeCount: number = 0,
): number {
  let s = 0
  if (identite.region)        s += 10
  if (identite.genre)         s += 5
  if (identite.dateNaissance) s += 5
  if (identite.commune)       s += 5
  if (profil?.biographie)     s += 20
  if (profil?.niveauEtude)    s += 10
  if (profil?.situationEmploi) s += 10
  if (Array.isArray(profil?.domainesInteret) && (profil.domainesInteret as unknown[]).length) s += 15
  if (Array.isArray(profil?.competences)     && (profil.competences     as unknown[]).length) s += 10
  if (expCount > 0)            s += 10
  if (diplomeCount > 0)        s += 10
  return Math.min(s, 100)
}

/**
 * GUIC-689 — Barème exposé, pour que la checklist de complétion affiche des
 * gains RÉELS plutôt que les pourcentages de la maquette (qui annonce « CV
 * +18 % » alors que le CV ne compte pas ici).
 *
 * ⚠️ Contrat posé, comportement non implémenté : cf.
 * `tests/unit/profil-completion-checklist.test.tsx`.
 */
export interface CritereScore {
  cle: string
  label: string
  poids: number
  rempli: boolean
}

export const CRITERES_SCORE: { cle: string; label: string; poids: number }[] = []

export function etatCompletion(
  _identite: IdentiteForScore,
  _profil: ProfilForScore | null,
  _expCount: number,
  _diplomeCount: number = 0,
): { score: number; criteres: CritereScore[] } {
  return { score: 0, criteres: [] }
}
