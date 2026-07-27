// Appariement SÉMANTIQUE des compétences (GUIC-677).
//
// Pourquoi : `skills-normalize.ts` apparie par la FORME (synonymes + distance de chaîne).
// « Développement web » et « Programmation front-end » n'ont aucun bigramme commun — ils
// ne se rejoignent jamais. C'est la cause directe de `PREPARE = 0` sur le POC et d'une
// couverture `MAITRISE` trop basse : l'analyse d'écart de compétences déclare « manquante »
// une compétence que la personne possède sous un autre nom.
//
// Le socle (transport, cache, cosinus) vit dans `../embeddings` depuis GUIC-683 : il sert
// aussi la recherche du catalogue. Ici on ne garde que ce qui est propre aux COMPÉTENCES.
//
// ⚠️ INVARIANT CDP : seuls des LIBELLÉS DE COMPÉTENCES et des THÈMES sont envoyés au
// modèle. Jamais un profil, un nom, un CV, une lettre de motivation.

import { cosine, embedTexts, isEmbeddingEnabled, SEMANTIC_THRESHOLD } from '../embeddings'
import { matchSkills, normalizeLabel, type SkillIndex, type SkillMatch, type SkillRef } from './skills-normalize'

export { SEMANTIC_THRESHOLD, cosine, embedTexts, embeddingModel, isEmbeddingEnabled } from '../embeddings'

/** Référentiel vectorisé, construit UNE fois par exécution (projection, requête). */
export interface SemanticSkillIndex {
  ids: string[]
  vectors: number[][]
}

/**
 * Vectorise le référentiel de compétences. `null` si la fonctionnalité est désactivée
 * ou si aucun vecteur n'a pu être obtenu → les appelants restent en lexical pur.
 */
export async function buildSemanticSkillIndex(
  skills: SkillRef[],
  opts: { maxNew?: number } = {},
): Promise<SemanticSkillIndex | null> {
  if (!isEmbeddingEnabled()) return null
  const vectors = await embedTexts(skills.map(s => s.libelle), opts)
  const ids: string[] = []
  const vecs: number[][] = []
  for (const s of skills) {
    const v = vectors.get(normalizeLabel(s.libelle))
    if (v) {
      ids.push(s.id)
      vecs.push(v)
    }
  }
  return ids.length ? { ids, vectors: vecs } : null
}

/**
 * Appariement sémantique PRÉ-CHARGÉ : tous les vecteurs (référentiel + textes à apparier)
 * sont récupérés en DEUX passes, puis la mise en correspondance est purement CPU.
 *
 * C'est ce qui rend la reprojection nocturne tenable : sans ça, chaque compétence de
 * chaque profil déclencherait un aller-retour Redis (22 000 bénéficiaires…).
 */
export interface SemanticMatcher {
  match(text: string, opts?: { threshold?: number; max?: number }): SkillMatch[]
}

/**
 * Prépare l'appariement sémantique pour un LOT de textes connus d'avance.
 * `null` si la fonctionnalité est désactivée ou indisponible → l'appelant reste lexical.
 */
export async function prepareSemanticMatcher(
  skills: SkillRef[],
  texts: string[],
  /**
   * `maxNew: 0` = lecture de cache STRICTE. C'est le réglage du chemin de RÉPONSE :
   * la vectorisation se paie hors ligne, jamais pendant que l'usager attend.
   */
  opts: { maxNew?: number } = {},
): Promise<SemanticMatcher | null> {
  const index = await buildSemanticSkillIndex(skills, opts)
  if (!index) return null
  const queries = await embedTexts(texts, opts)
  if (queries.size === 0) return null

  return {
    match(text, opts = {}) {
      const q = queries.get(normalizeLabel(text))
      if (!q) return []
      const threshold = opts.threshold ?? SEMANTIC_THRESHOLD
      const max = opts.max ?? 3
      const matches: SkillMatch[] = []
      for (let i = 0; i < index.ids.length; i++) {
        const score = cosine(q, index.vectors[i])
        if (score >= threshold) matches.push({ id: index.ids[i], score })
      }
      return matches.sort((a, b) => b.score - a.score).slice(0, max)
    },
  }
}

/**
 * Appariement HYBRIDE : lexical ∪ sémantique, dédupliqué (meilleur score gagné).
 * Point d'entrée unique de la projection ET du fallback Prisma — sans quoi les deux
 * moteurs dériveraient l'un de l'autre (invariant de parité, spec 02 §6).
 * Synchrone : les vecteurs sont déjà en mémoire (cf. `prepareSemanticMatcher`).
 */
export function matchSkillsHybrid(
  text: string,
  lexical: SkillIndex,
  semantic: SemanticMatcher | null,
  opts: { threshold?: number; max?: number } = {},
): SkillMatch[] {
  const max = opts.max ?? 3
  const lex = matchSkills(text, lexical, { max })
  if (!semantic) return lex

  const best = new Map<string, number>()
  for (const m of [...lex, ...semantic.match(text, { max })]) {
    best.set(m.id, Math.max(best.get(m.id) ?? 0, m.score))
  }
  return [...best.entries()]
    .map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
}
