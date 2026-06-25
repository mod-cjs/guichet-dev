// Normalisation floue compétences → nœuds Competence (GUIC-278, décision R2).
// Spec : .agent_context/specs/yaye/02-knowledge-graph-neo4j.md §4 (MAITRISE/ATTESTE/PREPARE)
//
// La source `ProfilJeune.competences` (Json texte libre) ne correspond pas 1-pour-1
// aux libellés du référentiel `Skill`. R2 acte un MATCHING FLOU : normalisation
// (accents/casse) + table de synonymes + similarité de chaîne (coefficient de Dice
// sur bigrammes) + containment. Module PUR (aucune dépendance Prisma) → testable.

export interface SkillRef {
  id: string
  slug: string
  libelle: string
}

export interface SkillMatch {
  id: string
  /** Confiance ∈ [0,1] : 1 = exact/synonyme, sinon similarité floue. */
  score: number
}

/** Seuil par défaut sous lequel on ne relie pas (évite le bruit). */
export const DEFAULT_THRESHOLD = 0.72

/**
 * Table de synonymes : forme canonique → variantes courantes (FR + abréviations).
 * Volontairement compacte et orientée métiers jeunesse/numérique du Guichet ;
 * extensible sans toucher à l'algorithme.
 */
const SYNONYMS: Record<string, string[]> = {
  'developpement web': ['dev web', 'web dev', 'developpeur web', 'integration web'],
  javascript: ['js', 'java script', 'ecmascript'],
  typescript: ['ts'],
  python: ['py'],
  'gestion de projet': ['gestion projet', 'chef de projet', 'project management', 'pmo'],
  comptabilite: ['compta', 'accounting'],
  marketing: ['mktg', 'marketing digital', 'digital marketing'],
  communication: ['comm', 'communication digitale'],
  'agriculture': ['agro', 'agronomie', 'agricole'],
  entrepreneuriat: ['entreprenariat', 'entrepreneur', 'business'],
  anglais: ['english'],
  bureautique: ['office', 'microsoft office', 'word excel'],
  'analyse de donnees': ['data analyse', 'data analysis', 'analyse data', 'data'],
  graphisme: ['design graphique', 'infographie', 'graphic design'],
}

/** Index inverse variante normalisée → forme canonique normalisée. */
const SYNONYM_INDEX: Map<string, string> = (() => {
  const m = new Map<string, string>()
  for (const [canon, variants] of Object.entries(SYNONYMS)) {
    const c = normalizeLabel(canon)
    m.set(c, c)
    for (const v of variants) m.set(normalizeLabel(v), c)
  }
  return m
})()

/** Minuscule, sans accents, ponctuation→espace, espaces compactés. */
export function normalizeLabel(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // diacritiques combinants
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/** Étend un terme normalisé vers sa forme canonique de synonyme (ou lui-même). */
function canonical(norm: string): string {
  return SYNONYM_INDEX.get(norm) ?? norm
}

/** Bigrammes de caractères (pour le coefficient de Dice). */
function bigrams(s: string): Map<string, number> {
  const compact = s.replace(/\s+/g, '')
  const out = new Map<string, number>()
  for (let i = 0; i < compact.length - 1; i++) {
    const bg = compact.slice(i, i + 2)
    out.set(bg, (out.get(bg) ?? 0) + 1)
  }
  return out
}

/** Coefficient de Sørensen–Dice ∈ [0,1] entre deux chaînes normalisées. */
export function diceCoefficient(a: string, b: string): number {
  if (a === b) return 1
  if (a.length < 2 || b.length < 2) return 0
  const A = bigrams(a)
  const B = bigrams(b)
  let inter = 0
  let total = 0
  for (const n of A.values()) total += n
  for (const n of B.values()) total += n
  for (const [bg, countA] of A) {
    const countB = B.get(bg)
    if (countB) inter += Math.min(countA, countB)
  }
  return (2 * inter) / total
}

interface IndexedSkill {
  id: string
  forms: string[] // libellé + slug + canonique, normalisés
}

export interface SkillIndex {
  skills: IndexedSkill[]
}

/** Pré-calcule les formes normalisées de chaque compétence du référentiel. */
export function buildSkillIndex(skills: SkillRef[]): SkillIndex {
  return {
    skills: skills.map(s => {
      const forms = new Set<string>()
      for (const raw of [s.libelle, s.slug]) {
        if (!raw) continue
        const n = normalizeLabel(raw)
        if (n) {
          forms.add(n)
          forms.add(canonical(n))
        }
      }
      return { id: s.id, forms: [...forms] }
    }),
  }
}

/** Meilleure similarité entre un terme requête et une forme de compétence. */
function bestSimilarity(query: string, form: string): number {
  if (query === form) return 1
  // Containment : la compétence apparaît dans un texte plus long (ex. intitulé de diplôme).
  if (form.length >= 4 && query.includes(form)) return 0.9
  if (query.length >= 4 && form.includes(query)) return 0.85
  return diceCoefficient(query, form)
}

/**
 * Relie un texte libre (une compétence saisie, un intitulé, un thème) aux nœuds
 * `Competence` du référentiel. Retourne les correspondances ≥ seuil, triées par
 * score décroissant et dédupliquées.
 *
 * @param max nombre maximum de correspondances retournées (défaut 3).
 */
export function matchSkills(
  text: string,
  index: SkillIndex,
  opts: { threshold?: number; max?: number } = {},
): SkillMatch[] {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD
  const max = opts.max ?? 3
  const q = canonical(normalizeLabel(text))
  if (!q) return []

  const matches: SkillMatch[] = []
  for (const skill of index.skills) {
    let best = 0
    for (const form of skill.forms) {
      const sim = bestSimilarity(q, form)
      if (sim > best) best = sim
      if (best === 1) break
    }
    if (best >= threshold) matches.push({ id: skill.id, score: best })
  }
  return matches
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
}

/** Compétence du référentiel enrichie de sa catégorie (pour la dérivée PREPARE). */
export interface SkillWithCategorie extends SkillRef {
  categorie?: string | null
}

/**
 * PREPARE (spec 02 §4 + tableau §relations : `theme ↔ Competence.categorie`).
 * Une ressource pédagogique PRÉPARE les compétences dont la CATÉGORIE correspond
 * à son thème — pas son libellé. On regroupe les compétences par catégorie, on
 * matche le thème (flou) sur le libellé de catégorie, et on relie la ressource à
 * TOUTES les compétences des catégories retenues.
 *
 * @returns les ids `Competence` à relier (dédupliqués).
 */
export function matchThemeToCategorieSkills(
  theme: string,
  skills: SkillWithCategorie[],
  opts: { threshold?: number } = {},
): string[] {
  const threshold = opts.threshold ?? DEFAULT_THRESHOLD
  const q = canonical(normalizeLabel(theme))
  if (!q) return []

  // Regroupe les ids de compétences par catégorie normalisée (+ sa forme canonique).
  const byCategorie = new Map<string, { forms: Set<string>; ids: string[] }>()
  for (const s of skills) {
    if (!s.categorie) continue
    const n = normalizeLabel(s.categorie)
    if (!n) continue
    const entry = byCategorie.get(n) ?? { forms: new Set([n, canonical(n)]), ids: [] }
    entry.ids.push(s.id)
    byCategorie.set(n, entry)
  }

  const ids = new Set<string>()
  for (const { forms, ids: skillIds } of byCategorie.values()) {
    let best = 0
    for (const form of forms) {
      const sim = bestSimilarity(q, form)
      if (sim > best) best = sim
      if (best === 1) break
    }
    if (best >= threshold) for (const id of skillIds) ids.add(id)
  }
  return [...ids]
}

/** Parse `ProfilJeune.competences` (Json : string[] direct, ou texte JSON, ou null). */
export function parseCompetences(value: unknown): string[] {
  let arr: unknown = value
  if (typeof value === 'string') {
    if (!value.trim()) return []
    try {
      arr = JSON.parse(value)
    } catch {
      return []
    }
  }
  if (!Array.isArray(arr)) return []
  return arr.filter((c): c is string => typeof c === 'string' && c.trim().length > 0)
}
