// GUIC-537 — Client LLM partagé et résilient (interface OpenAI-compatible).
//
// Deux fournisseurs, sélectionnés par `LLM_PROVIDER` :
//  - `vertex` (DÉFAUT, prod) : Vertex AI expose un endpoint OpenAI-COMPATIBLE
//      https://{LOCATION}-aiplatform.googleapis.com/v1/projects/{PROJECT}/locations/{LOCATION}/endpoints/openapi
//    Auth : jeton OAuth GCP (service account / ADC) injecté PAR REQUÊTE via un `fetch`
//    maison → toujours frais, `getLlmClient()` reste synchrone.
//  - `lmstudio` (DEV LOCAL) : serveur LMStudio local (OpenAI-compatible), aucune auth,
//    aucune dépendance GCP → Yaye tourne 100% en local. Base URL `LMSTUDIO_BASE_URL`.
//
// On réutilise le SDK `openai` (interface `.chat.completions.create`) → les
// consommateurs (agent / judge / adequation / memory) sont agnostiques du fournisseur.
// Robustesse : `timeout` + `maxRetries`, surchargeables sans redéploiement.

import OpenAI from 'openai'
import { GoogleAuth } from 'google-auth-library'
import { getModelMeta } from './supported-models'

/** Fournisseur LLM actif. `vertex` par défaut ; `lmstudio` pour le dev local. */
export type ActiveProvider = 'vertex' | 'lmstudio'

export function activeProvider(): ActiveProvider {
  const p = (process.env.LLM_PROVIDER ?? '').trim().toLowerCase()
  return p === 'lmstudio' || p === 'lm-studio' || p === 'local' ? 'lmstudio' : 'vertex'
}

/** True si Yaye doit taper LMStudio en local plutôt que Vertex. */
export function isLocalProvider(): boolean {
  return activeProvider() === 'lmstudio'
}

/** Base URL du serveur LMStudio local (OpenAI-compatible). */
const LMSTUDIO_DEFAULT_URL = 'http://localhost:1234/v1'
function lmstudioBaseUrl(): string {
  return process.env.LMSTUDIO_BASE_URL?.trim() || LMSTUDIO_DEFAULT_URL
}

/** Modèle utilisé en mode local (id du modèle chargé dans LMStudio). */
export function localModel(): string {
  return process.env.LMSTUDIO_MODEL?.trim() || 'local-model'
}

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
  // Mode local : LMStudio ne requiert aucune config GCP.
  if (isLocalProvider()) return true
  return Boolean(process.env.GOOGLE_CLOUD_PROJECT)
}

/**
 * Base URL à utiliser pour un modèle donné :
 *  - fournisseur `lmstudio` → serveur LMStudio local ;
 *  - modèle MaaS/Gemini (Vertex, défaut) → endpoint `endpoints/openapi` partagé ;
 *  - modèle self-deployed (Gemma, `deployed: true`) → endpoint dédié provisionné
 *    (`VERTEX_DEDICATED_ENDPOINT_URL`), sinon on lève (évite un appel silencieusement cassé).
 */
export function baseUrlForModel(model?: string): string {
  if (isLocalProvider()) return lmstudioBaseUrl()
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
    if (isLocalProvider()) {
      // LMStudio : aucune auth GCP, clé factice acceptée par le serveur local.
      client = new OpenAI({
        apiKey: process.env.LMSTUDIO_API_KEY?.trim() || 'lm-studio',
        baseURL,
        timeout: TIMEOUT_MS,
        maxRetries: MAX_RETRIES,
      })
    } else {
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
    }
    _clients.set(baseURL, client)
  }
  return client
}

/** Réinitialise les singletons (tests). */
export function __resetLlmClient(): void {
  _clients.clear()
  _auth = null
}
