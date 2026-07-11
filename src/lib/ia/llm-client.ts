// GUIC-537 — Client LLM partagé et résilient, pointé sur Vertex AI (GCP).
//
// Vertex expose un endpoint OpenAI-COMPATIBLE :
//   https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/endpoints/openapi
// On réutilise donc le SDK `openai` (interface `.chat.completions.create`) → les
// consommateurs (agent / judge / adequation / memory) changent à peine.
//
// Auth : jeton OAuth GCP (service account / ADC) injecté PAR REQUÊTE via un `fetch`
// maison → le jeton est toujours frais (google-auth-library gère le cache/refresh),
// et `getLlmClient()` reste synchrone.
//
// Robustesse prod (héritée de l'ancien client Groq) : `timeout` + `maxRetries`,
// surchargeables sans redéploiement.

import OpenAI from 'openai'
import { GoogleAuth } from 'google-auth-library'
import { getModelMeta } from './supported-models'

function numEnv(name: string, def: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return def
  const v = Number(raw)
  return Number.isFinite(v) ? v : def
}

/** Timeout par tentative (ms). Décision/synthèse Yaye visent < 20 s. */
const TIMEOUT_MS = numEnv('YAYE_LLM_TIMEOUT_MS', 20_000)
/** Retries automatiques (429/5xx/réseau) avant abandon. */
const MAX_RETRIES = numEnv('YAYE_LLM_MAX_RETRIES', 2)

const VERTEX_SCOPE = 'https://www.googleapis.com/auth/cloud-platform'

/** Région Vertex par défaut si non configurée. */
const DEFAULT_LOCATION = 'us-central1'

/** Base URL de l'endpoint OpenAI-compatible de Vertex, dérivée de l'environnement. */
export function getVertexBaseUrl(): string {
  const project = process.env.GOOGLE_CLOUD_PROJECT
  const location = process.env.GOOGLE_CLOUD_LOCATION?.trim() || DEFAULT_LOCATION
  if (!project) {
    throw new Error('GOOGLE_CLOUD_PROJECT manquant : impossible de cibler Vertex AI.')
  }
  return `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/endpoints/openapi`
}

/** L'IA est-elle configurée ? (remplace l'ancien garde `GROQ_API_KEY`). */
export function isLlmConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLOUD_PROJECT)
}

/**
 * Base URL à utiliser pour un modèle donné :
 *  - modèle MaaS/Gemini (défaut) → endpoint `endpoints/openapi` partagé ;
 *  - modèle self-deployed (Gemma, `deployed: true`) → endpoint dédié provisionné
 *    (`VERTEX_DEDICATED_ENDPOINT_URL`), sinon on lève (évite un appel silencieusement cassé).
 */
export function baseUrlForModel(model?: string): string {
  const meta = model ? getModelMeta(model) : undefined
  if (meta?.deployed) {
    const url = process.env.VERTEX_DEDICATED_ENDPOINT_URL?.trim()
    if (!url) {
      throw new Error(
        `Le modèle "${model}" est self-deployed : renseigne VERTEX_DEDICATED_ENDPOINT_URL (endpoint dédié Vertex).`,
      )
    }
    return url
  }
  return getVertexBaseUrl()
}

let _auth: GoogleAuth | null = null
function getAuth(): GoogleAuth {
  if (!_auth) _auth = new GoogleAuth({ scopes: VERTEX_SCOPE })
  return _auth
}

/** Un client OpenAI-compat par base URL (endpoint partagé + éventuels endpoints dédiés). */
const _clients = new Map<string, OpenAI>()

/**
 * Instance OpenAI-compatible pointée sur Vertex, mémoïsée par base URL. Passe le modèle
 * pour router automatiquement les modèles self-deployed vers leur endpoint dédié.
 * Le jeton GCP est injecté à chaque requête par le `fetch` maison (toujours frais).
 */
export function getLlmClient(model?: string): OpenAI {
  const baseURL = baseUrlForModel(model)
  let client = _clients.get(baseURL)
  if (!client) {
    const auth = getAuth()
    client = new OpenAI({
      // Placeholder : l'auth réelle passe par l'en-tête Authorization (fetch ci-dessous).
      apiKey: 'vertex-oauth',
      baseURL,
      timeout: TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
      fetch: async (url: RequestInfo | URL, init?: RequestInit) => {
        const token = await auth.getAccessToken()
        const headers = new Headers(init?.headers)
        if (token) headers.set('Authorization', `Bearer ${token}`)
        return fetch(url, { ...init, headers })
      },
    })
    _clients.set(baseURL, client)
  }
  return client
}

/** Réinitialise les singletons (tests). */
export function __resetLlmClient(): void {
  _clients.clear()
  _auth = null
}
