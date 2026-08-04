interface IdentiteForScore {
  region:        unknown
  commune:       unknown
  genre:         unknown
  dateNaissance: unknown
}

interface ProfilForScore {
  biographie:      unknown
  niveauEtude:     unknown
  domainesInteret: unknown
  situationEmploi: unknown
  competences:     unknown
}

interface ContexteScore {
  identite:     IdentiteForScore
  profil:       ProfilForScore | null
  expCount:     number
  diplomeCount: number
}

/** Un tableau JSON non vide (les champs `Json?` de Prisma arrivent tels quels). */
const listeNonVide = (v: unknown): boolean => Array.isArray(v) && v.length > 0

/**
 * GUIC-689 — Barème de complétion, source UNIQUE.
 *
 * Le score et la checklist de l'aside en dérivent tous les deux : afficher un
 * gain qui ne correspond pas à ce que le score accorde réellement serait une
 * caution fabriquée (règle R2 du standard qualité). La maquette v5 annonce par
 * exemple « Ajouter ton CV +18 % » — or le CV ne compte pas dans ce barème ;
 * on n'a donc pas recopié ce chiffre.
 *
 * Les libellés sont ceux montrés à l'utilisateur : jamais une clé technique.
 */
export const CRITERES_SCORE: {
  cle: string
  label: string
  poids: number
  rempli: (c: ContexteScore) => boolean
}[] = [
  { cle: 'biographie',  label: 'Présente-toi en quelques lignes', poids: 20, rempli: (c) => Boolean(c.profil?.biographie) },
  { cle: 'domaines',    label: 'Tes secteurs d’intérêt',          poids: 15, rempli: (c) => listeNonVide(c.profil?.domainesInteret) },
  { cle: 'region',      label: 'Ta région',                       poids: 10, rempli: (c) => Boolean(c.identite.region) },
  { cle: 'niveauEtude', label: 'Ton niveau d’étude',              poids: 10, rempli: (c) => Boolean(c.profil?.niveauEtude) },
  { cle: 'situation',   label: 'Ta situation actuelle',           poids: 10, rempli: (c) => Boolean(c.profil?.situationEmploi) },
  { cle: 'competences', label: 'Tes compétences',                 poids: 10, rempli: (c) => listeNonVide(c.profil?.competences) },
  { cle: 'experience',  label: 'Une expérience professionnelle',  poids: 10, rempli: (c) => c.expCount > 0 },
  { cle: 'diplome',     label: 'Un diplôme',                      poids: 10, rempli: (c) => c.diplomeCount > 0 },
  { cle: 'genre',       label: 'Ton genre',                       poids: 5,  rempli: (c) => Boolean(c.identite.genre) },
  { cle: 'naissance',   label: 'Ta date de naissance',            poids: 5,  rempli: (c) => Boolean(c.identite.dateNaissance) },
  { cle: 'commune',     label: 'Ta commune',                      poids: 5,  rempli: (c) => Boolean(c.identite.commune) },
]

/** Critère évalué pour un profil donné — ce que consomme la checklist. */
export interface CritereScore {
  cle: string
  label: string
  poids: number
  rempli: boolean
}

export function calculerScore(
  identite:     IdentiteForScore,
  profil:       ProfilForScore | null,
  expCount:     number,
  diplomeCount: number = 0,
): number {
  return etatCompletion(identite, profil, expCount, diplomeCount).score
}

/**
 * Score ET détail des critères, calculés d'un seul tenant. Impossible que le
 * chiffre affiché et les étapes listées racontent deux histoires différentes.
 */
export function etatCompletion(
  identite:     IdentiteForScore,
  profil:       ProfilForScore | null,
  expCount:     number,
  diplomeCount: number = 0,
): { score: number; criteres: CritereScore[] } {
  const ctx: ContexteScore = { identite, profil, expCount, diplomeCount }
  const criteres = CRITERES_SCORE.map(({ cle, label, poids, rempli }) => ({
    cle,
    label,
    poids,
    rempli: rempli(ctx),
  }))
  const score = criteres.filter((c) => c.rempli).reduce((s, c) => s + c.poids, 0)
  return { score: Math.min(score, 100), criteres }
}
