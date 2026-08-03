// Socle générique d'EMBEDDINGS (GUIC-677 → GUIC-683).
//
// Extrait de `graph/skills-embeddings.ts`, qui l'avait introduit pour l'appariement des
// compétences. Le besoin a débordé du graphe : la recherche du catalogue, la déduplication
// de la veille, la reco à froid et la mesure de diversité s'appuient sur la même primitive
// — vectoriser du texte, le mettre en cache, comparer par cosinus.
//
// ⚠️ INVARIANT CDP : ce module ne sait pas ce qu'il vectorise. C'est à l'APPELANT de ne lui
// donner que du vocabulaire métier — libellés de compétences, thèmes, titres d'offres.
// Jamais un profil, un nom, un CV ou une lettre de motivation.
//
// ⚠️ FAIL-SOFT : toute indisponibilité (modèle coupé, projet absent, quota, réseau) rend
// une map vide. Les appelants retombent alors sur leur comportement lexical d'origine.

import { createHash } from 'node:crypto'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { numEnv, strEnv } from './env'
import { getLlmClient, isLocalProvider } from './llm-client'
import { DEFAULT_TASK_TYPE, embedWithVertex, vertexBatchSize, type EmbeddingTaskType } from './vertex-embeddings'

const PREFIX = 'yaye:emb:'
/** Le vocabulaire métier bouge très peu — on garde les vecteurs longtemps. */
const TTL_VECTOR = numEnv('YAYE_EMBEDDING_TTL_S', 90 * 24 * 3600)
/** Taille de lot par défaut (fournisseur local ; Vertex la dérive du modèle). */
const BATCH = numEnv('YAYE_EMBEDDING_BATCH', 96)
/** Garde-fou de coût : nombre max de NOUVEAUX textes vectorisés par appel. */
const MAX_NEW_PER_RUN = numEnv('YAYE_EMBED_MAX_PER_RUN', 500)
/** Seuil de similarité cosinus au-delà duquel deux textes désignent la même chose. */
export const SEMANTIC_THRESHOLD = numEnv('YAYE_EMBEDDING_THRESHOLD', 0.78)

/**
 * Modèle par défaut : `gemini-embedding-001` — CONFIRMÉ par la mesure locale du
 * 2026-07-27 sur le catalogue réel. Comparé à `text-multilingual-embedding-002` sur des
 * paires requête↔offre connues :
 *
 *   « sites web » → Développeur web junior          0,594 → 0,638
 *   « planter des arbres » → Volontariat reboisement 0,644 → 0,714
 *   « élever des poulets » → Technicien aviculture     —   → 0,648
 *
 * Le multilingue-002 est ~15× plus rapide à préchauffer (vrais lots contre une instance
 * par requête), mais son signal est trop faible pour être séparé du bruit. On paie donc
 * le préchauffage lent une fois, et on gagne en pertinence tous les jours.
 *
 * Coupure : `YAYE_EMBEDDING_MODEL="off"` (ou `none` / `false`) → tout redevient lexical.
 */
const DEFAULT_EMBEDDING_MODEL = 'gemini-embedding-001'
const DESACTIVE = new Set(['off', 'none', 'false', '0', 'disabled'])

/** Modèle d'embedding actif, ou null si explicitement désactivé. */
export function embeddingModel(): string | null {
  const configured = strEnv('YAYE_EMBEDDING_MODEL')
  if (configured && DESACTIVE.has(configured.toLowerCase())) return null
  return configured ?? DEFAULT_EMBEDDING_MODEL
}

/** L'appariement sémantique est-il activé ? (sinon : lexical strict, comme avant). */
export function isEmbeddingEnabled(): boolean {
  return embeddingModel() !== null
}

/** Taille de lot effective : Vertex la contraint par modèle (gemini-embedding = 1). */
function batchSizeFor(model: string): number {
  return isLocalProvider() ? BATCH : vertexBatchSize(model)
}

/** Normalisation commune : minuscule, sans accents, ponctuation compactée. */
export function normalizeForEmbedding(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Clé de cache. Le TYPE DE TÂCHE en fait partie : le même texte vectorisé en
 * `RETRIEVAL_DOCUMENT` ou en `SEMANTIC_SIMILARITY` donne DEUX vecteurs différents, qu'on
 * ne doit jamais confondre. Sans ce composant, la recherche lirait les vecteurs de
 * l'appariement des compétences et comparerait des choux et des carottes.
 */
function vectorKey(model: string, taskType: EmbeddingTaskType, text: string): string {
  const suffixe = taskType === DEFAULT_TASK_TYPE ? '' : `${taskType.toLowerCase()}:`
  return `${PREFIX}${model}:${suffixe}${createHash('sha1').update(text).digest('hex')}`
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

/**
 * Appelle le fournisseur pour un lot de textes. `null` si l'endpoint ne répond pas.
 *  - Vertex (prod)  → API NATIVE `:predict` : l'endpoint OpenAI-compatible de Vertex
 *    couvre `chat/completions`, mais pas `/embeddings` de façon garantie ;
 *  - LMStudio (dev) → `/v1/embeddings`, que le serveur local expose bien.
 */
async function embedBatch(model: string, texts: string[], taskType: EmbeddingTaskType): Promise<number[][] | null> {
  if (!isLocalProvider()) return embedWithVertex(model, texts, taskType)
  try {
    const res = await getLlmClient(model).embeddings.create({ model, input: texts })
    const vectors = res.data.map(d => d.embedding as number[])
    return vectors.length === texts.length ? vectors : null
  } catch (err) {
    logger.warn('[emb] embedding local indisponible → repli lexical', { err: String(err) })
    return null
  }
}

// ── Stockage compact des vecteurs ─────────────────────────────────────────────
// Redis est MUTUALISÉ entre plateformes CJS (1 Go). Un vecteur 768 dimensions coûte
// ~12 Ko en JSON contre ~4 Ko en Float32/base64 : on stocke donc en binaire encodé.

export function encodeVector(v: number[]): string {
  return Buffer.from(new Float32Array(v).buffer).toString('base64')
}

export function decodeVector(raw: string): number[] | null {
  try {
    // Rétro-compat : les entrées écrites en JSON avant ce changement restent lisibles.
    if (raw.startsWith('[')) {
      const v = JSON.parse(raw) as number[]
      return Array.isArray(v) && v.length ? v : null
    }
    const buf = Buffer.from(raw, 'base64')
    if (buf.byteLength === 0 || buf.byteLength % 4 !== 0) return null
    return Array.from(new Float32Array(buf.buffer, buf.byteOffset, buf.byteLength / 4))
  } catch {
    return null
  }
}

export interface EmbedOptions {
  /**
   * Nature de la comparaison visée. `SEMANTIC_SIMILARITY` (défaut) pour comparer deux
   * textes de même nature ; `RETRIEVAL_QUERY` / `RETRIEVAL_DOCUMENT` pour une recherche,
   * qui est asymétrique. Le cache distingue les deux.
   */
  taskType?: EmbeddingTaskType
  /**
   * Plafond de NOUVEAUX textes vectorisés pendant cet appel.
   * `0` = lecture de cache uniquement — c'est le réglage du chemin de RÉPONSE :
   * jamais de vectorisation à chaud, donc jamais de latence surprise pour l'usager.
   * Le préchauffage nocturne, lui, relève ce plafond.
   */
  maxNew?: number
}

/**
 * Vecteurs des textes demandés (clés = texte NORMALISÉ), avec cache Redis.
 * Les textes déjà connus ne sont jamais re-vectorisés. Fail-soft : une entrée absente
 * = pas de vecteur, donc pas d'appariement sémantique pour ce texte.
 */
export async function embedTexts(texts: string[], opts: EmbedOptions = {}): Promise<Map<string, number[]>> {
  const out = new Map<string, number[]>()
  const model = embeddingModel()
  if (!model) return out

  const taskType = opts.taskType ?? DEFAULT_TASK_TYPE
  const uniques = [...new Set(texts.map(normalizeForEmbedding).filter(Boolean))]
  if (uniques.length === 0) return out

  // 1. Lecture du cache (une seule commande).
  try {
    const cached = await redis.mget(...uniques.map(t => vectorKey(model, taskType, t)))
    cached.forEach((raw, i) => {
      if (!raw) return
      const v = decodeVector(raw)
      if (v) out.set(uniques[i], v) // entrée corrompue → simplement recalculée
    })
  } catch (err) {
    logger.warn('[emb] lecture cache échouée', { err: String(err) })
  }

  // 2. Vectorisation des manquants, sous plafond de coût.
  const plafond = opts.maxNew ?? MAX_NEW_PER_RUN
  if (plafond <= 0) return out

  let missing = uniques.filter(t => !out.has(t))
  if (missing.length > plafond) {
    logger.warn('[emb] plafond de vectorisation atteint — le reste reste lexical', {
      demandes: missing.length,
      plafond,
    })
    missing = missing.slice(0, plafond)
  }

  const taille = batchSizeFor(model)
  for (let i = 0; i < missing.length; i += taille) {
    const slice = missing.slice(i, i + taille)
    const vectors = await embedBatch(model, slice, taskType)
    if (!vectors) return out // endpoint HS → on s'arrête là, le lexical prend le relais
    for (let j = 0; j < slice.length; j++) {
      out.set(slice[j], vectors[j])
      try {
        await redis.set(vectorKey(model, taskType, slice[j]), encodeVector(vectors[j]), 'EX', TTL_VECTOR)
      } catch { /* cache best-effort */ }
    }
  }
  return out
}
