// Embeddings Vertex AI — API NATIVE `:predict` (GUIC-677).
//
// Pourquoi pas l'endpoint OpenAI-compatible : celui-ci couvre `chat/completions`, mais
// `POST /embeddings` n'y est pas garanti côté Vertex. On appelle donc directement le
// modèle publisher :
//
//   POST https://{LOC}-aiplatform.googleapis.com/v1/projects/{PROJ}/locations/{LOC}
//        /publishers/google/models/{MODEL}:predict
//   { "instances": [{ "content": "...", "task_type": "SEMANTIC_SIMILARITY" }],
//     "parameters": { "outputDimensionality": 768 } }
//
// Même authentification que le reste de Yaye (jeton OAuth GCP via ADC / compte de
// service) — aucune clé d'API supplémentaire à gérer.
//
// ⚠️ CONTRAINTE MODÈLE : `gemini-embedding-001` n'accepte QU'UNE instance par requête,
// là où les modèles `text-*-embedding-*` en acceptent jusqu'à 250. La taille de lot est
// donc dérivée du modèle — sinon la première projection échoue en masse (400).
//
// ⚠️ COÛT/MÉMOIRE : `gemini-embedding-001` renvoie 3072 dimensions par défaut. Stockées
// telles quelles, ~5 000 vecteurs saturent le Redis mutualisé. On demande donc 768
// dimensions (troncature MRL supportée) — sans effet sur le cosinus, qui est invariant
// d'échelle.

import { logger } from '@/lib/logger'
import { getGcpAccessToken, vertexProjectLocation } from './llm-client'
import { numEnv } from './env'

/** Dimensions demandées (MRL). 768 = bon compromis qualité / empreinte Redis. */
export const EMBEDDING_DIMENSIONS = numEnv('YAYE_EMBEDDING_DIMENSIONS', 768)

/**
 * Tâche déclarée au modèle. `SEMANTIC_SIMILARITY` est le bon type ici : on compare deux
 * libellés de MÊME nature (« Développement web » ↔ « Programmation front-end »), pas une
 * question à un document (ce serait RETRIEVAL_QUERY / RETRIEVAL_DOCUMENT, asymétriques).
 */
const TASK_TYPE = 'SEMANTIC_SIMILARITY'

/** Modèles Gemini/Vertex n'acceptant qu'UNE instance par appel. */
const SINGLE_INSTANCE_MODELS = /^gemini-embedding/

/** Taille de lot maximale acceptée par le modèle. */
export function vertexBatchSize(model: string): number {
  return SINGLE_INSTANCE_MODELS.test(model) ? 1 : numEnv('YAYE_EMBEDDING_BATCH', 96)
}

function predictUrl(model: string): string | null {
  const { project, location } = vertexProjectLocation()
  if (!project) return null
  return (
    `https://${location}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${location}/publishers/google/models/${encodeURIComponent(model)}:predict`
  )
}

interface PredictResponse {
  predictions?: Array<{ embeddings?: { values?: number[] } }>
}

/**
 * Vectorise un lot de textes. `null` en cas d'indisponibilité (projet non configuré,
 * modèle inconnu, quota, API désactivée) → l'appelant retombe sur l'appariement lexical.
 */
export async function embedWithVertex(model: string, texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return []
  const url = predictUrl(model)
  if (!url) {
    logger.warn('[vertex-emb] GOOGLE_CLOUD_PROJECT absent → repli lexical')
    return null
  }

  let token: string | null
  try {
    token = await getGcpAccessToken()
  } catch (err) {
    logger.warn('[vertex-emb] jeton GCP indisponible → repli lexical', { err: String(err) })
    return null
  }
  if (!token) return null

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        instances: texts.map(content => ({ content, task_type: TASK_TYPE })),
        parameters: { outputDimensionality: EMBEDDING_DIMENSIONS },
      }),
    })
    if (!res.ok) {
      logger.warn('[vertex-emb] réponse en erreur → repli lexical', {
        status: res.status,
        detail: (await res.text().catch(() => '')).slice(0, 300),
      })
      return null
    }
    const json = (await res.json()) as PredictResponse
    const vectors = (json.predictions ?? []).map(p => p.embeddings?.values ?? [])
    // Un lot partiel casserait l'appariement (décalage texte ↔ vecteur) : on préfère rien.
    return vectors.length === texts.length && vectors.every(v => v.length > 0) ? vectors : null
  } catch (err) {
    logger.warn('[vertex-emb] appel échoué → repli lexical', { err: String(err) })
    return null
  }
}
