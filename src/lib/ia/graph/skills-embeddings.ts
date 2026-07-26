// Appariement SÉMANTIQUE des compétences (GUIC-677).
//
// Pourquoi : `skills-normalize.ts` apparie par la FORME (synonymes + distance de chaîne).
// « Développement web » et « Programmation front-end » n'ont aucun bigramme commun — ils
// ne se rejoignent jamais. C'est la cause directe de `PREPARE = 0` sur le POC et d'une
// couverture `MAITRISE` trop basse : l'analyse d'écart de compétences déclare « manquante »
// une compétence que la personne possède sous un autre nom.
//
// Emprunt ciblé à GraphRAG (Microsoft), qui s'appuie sur des embeddings pour rapprocher
// des entités formulées différemment. Ici on reste BEAUCOUP plus étroit :
//
// ⚠️ INVARIANT CDP : seuls des LIBELLÉS DE COMPÉTENCES et des THÈMES sont envoyés au
// modèle d'embedding. Jamais un profil, un nom, un CV, une lettre de motivation. Le
// vocabulaire métier n'est pas une donnée personnelle.
//
// ⚠️ OPT-IN et FAIL-SOFT : sans `YAYE_EMBEDDING_MODEL`, ce module est inerte et le
// comportement lexical est strictement inchangé. Toute erreur (endpoint absent, quota,
// réponse invalide) retombe silencieusement sur le lexical.

import { createHash } from 'node:crypto'
import { redis } from '@/lib/redis'
import { numEnv, strEnv } from '../env'
import { logger } from '@/lib/logger'
import { getLlmClient } from '../llm-client'
import { matchSkills, normalizeLabel, type SkillIndex, type SkillMatch, type SkillRef } from './skills-normalize'

const PREFIX = 'yaye:emb:'
/** Le vocabulaire métier bouge très peu — on garde les vecteurs longtemps. */
const TTL_VECTOR = numEnv('YAYE_EMBEDDING_TTL_S', 90 * 24 * 3600)
/** Taille de lot d'appel au fournisseur. */
const BATCH = numEnv('YAYE_EMBEDDING_BATCH', 96)
/** Garde-fou de coût : nombre max de NOUVEAUX textes vectorisés par exécution. */
const MAX_NEW_PER_RUN = numEnv('YAYE_EMBED_MAX_PER_RUN', 500)
/** Seuil de similarité cosinus au-delà duquel deux libellés désignent la même chose. */
export const SEMANTIC_THRESHOLD = numEnv('YAYE_EMBEDDING_THRESHOLD', 0.78)

/** Modèle d'embedding actif, ou null si la fonctionnalité n'est pas configurée. */
export function embeddingModel(): string | null {
  return strEnv('YAYE_EMBEDDING_MODEL')
}

/** L'appariement sémantique est-il activé ? (sinon : lexical strict, comme avant). */
export function isEmbeddingEnabled(): boolean {
  return embeddingModel() !== null
}

function vectorKey(model: string, text: string): string {
  return `${PREFIX}${model}:${createHash('sha1').update(text).digest('hex')}`
}

/** Similarité cosinus ∈ [-1,1] (0 si dimensions incompatibles). */
export function cosine(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na += a[i] * a[i]
    nb += b[i] * b[i]
  }
  const d = Math.sqrt(na) * Math.sqrt(nb)
  return d === 0 ? 0 : dot / d
}

/** Appelle le fournisseur pour un lot de textes. `null` si l'endpoint ne répond pas. */
async function embedBatch(model: string, texts: string[]): Promise<number[][] | null> {
  try {
    const res = await getLlmClient(model).embeddings.create({ model, input: texts })
    const vectors = res.data.map(d => d.embedding as number[])
    return vectors.length === texts.length ? vectors : null
  } catch (err) {
    logger.warn('[skills-emb] embedding indisponible → repli lexical', { err: String(err) })
    return null
  }
}

/**
 * Vecteurs des textes demandés (normalisés), avec cache Redis. Les textes déjà connus
 * ne sont jamais re-vectorisés. Fail-soft : une entrée absente = pas de vecteur, donc
 * pas d'appariement sémantique pour ce texte (le lexical reste seul juge).
 */
export async function embedTexts(texts: string[]): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>()
  const model = embeddingModel()
  if (!model) return out

  const uniques = [...new Set(texts.map(t => normalizeLabel(t)).filter(Boolean))]
  if (uniques.length === 0) return out

  // 1. Lecture du cache (une seule commande).
  try {
    const cached = await redis.mget(...uniques.map(t => vectorKey(model, t)))
    cached.forEach((raw, i) => {
      if (!raw) return
      try {
        const v = JSON.parse(raw) as number[]
        if (Array.isArray(v) && v.length) out.set(uniques[i], v)
      } catch { /* entrée corrompue → sera recalculée */ }
    })
  } catch (err) {
    logger.warn('[skills-emb] lecture cache échouée', { err: String(err) })
  }

  // 2. Vectorisation des manquants, sous plafond de coût.
  let missing = uniques.filter(t => !out.has(t))
  if (missing.length > MAX_NEW_PER_RUN) {
    logger.warn('[skills-emb] plafond de vectorisation atteint — le reste reste lexical', {
      demandes: missing.length,
      plafond: MAX_NEW_PER_RUN,
    })
    missing = missing.slice(0, MAX_NEW_PER_RUN)
  }

  for (let i = 0; i < missing.length; i += BATCH) {
    const slice = missing.slice(i, i + BATCH)
    const vectors = await embedBatch(model, slice)
    if (!vectors) return out // endpoint HS → on s'arrête là, le lexical prend le relais
    for (let j = 0; j < slice.length; j++) {
      out.set(slice[j], vectors[j])
      try {
        await redis.set(vectorKey(model, slice[j]), JSON.stringify(vectors[j]), 'EX', TTL_VECTOR)
      } catch { /* cache best-effort */ }
    }
  }
  return out
}

/** Référentiel vectorisé, construit UNE fois par exécution (projection, requête). */
export interface SemanticSkillIndex {
  ids: string[]
  vectors: number[][]
}

/**
 * Vectorise le référentiel de compétences. `null` si la fonctionnalité est désactivée
 * ou si aucun vecteur n'a pu être obtenu → les appelants restent en lexical pur.
 */
export async function buildSemanticSkillIndex(skills: SkillRef[]): Promise<SemanticSkillIndex | null> {
  if (!isEmbeddingEnabled()) return null
  const vectors = await embedTexts(skills.map(s => s.libelle))
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
): Promise<SemanticMatcher | null> {
  const index = await buildSemanticSkillIndex(skills)
  if (!index) return null
  const queries = await embedTexts(texts)
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
