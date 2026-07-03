/**
 * GUIC-517 — Rapprochement des compétences du candidat avec celles requises par
 * l'offre, pour la fiche candidat recruteur. Fonction pure (comparaison
 * insensible à la casse, aux accents et aux espaces superflus).
 */
export interface CompetenceMatch {
  libelle: string
  possede: boolean
}

export interface CompetencesMatchResult {
  /** Compétences requises par l'offre, avec indication de possession. */
  requises: CompetenceMatch[]
  /** Compétences du candidat qui ne sont pas requises par l'offre. */
  autres: string[]
  /** Part (%) des compétences requises couvertes par le candidat. */
  tauxCouverture: number
}

/** Normalise pour comparaison : trim, minuscule, sans accents. */
function norm(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function matchCompetences(
  offreSkills: string[],
  candidatCompetences: string[],
): CompetencesMatchResult {
  const requisesLibelles = offreSkills.map((s) => s.trim()).filter(Boolean)
  const candidatLibelles = candidatCompetences.map((s) => s.trim()).filter(Boolean)

  const candSet = new Set(candidatLibelles.map(norm))
  const reqSet = new Set(requisesLibelles.map(norm))

  const requises: CompetenceMatch[] = requisesLibelles.map((libelle) => ({
    libelle,
    possede: candSet.has(norm(libelle)),
  }))
  const autres = candidatLibelles.filter((c) => !reqSet.has(norm(c)))
  const couvertes = requises.filter((r) => r.possede).length
  const tauxCouverture = requises.length ? Math.round((couvertes / requises.length) * 100) : 0

  return { requises, autres, tauxCouverture }
}
