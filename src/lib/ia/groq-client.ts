// Client Groq partagé et RÉSILIENT pour Yaye (GUIC-259).
// Source unique de l'instance Groq (avant : 3 singletons dupliqués dans
// agent.ts / memory.ts / judge.ts).
//
// Robustesse prod (audit technique E2/E3) :
//  - `timeout`     : abandonne un appel pendu (latence Groq non bornée) → libère le
//                    tour au lieu de bloquer le SSE web ou la fenêtre de retry Meta.
//  - `maxRetries`  : le SDK Groq réessaie automatiquement les 429 / 5xx / erreurs
//                    réseau avec backoff exponentiel (respecte `Retry-After`).
// Surchargeable par variables d'environnement (tuning prod sans redéploiement).

import Groq from 'groq-sdk'

function numEnv(name: string, def: number): number {
  const raw = process.env[name]
  if (raw === undefined || raw.trim() === '') return def
  const v = Number(raw)
  return Number.isFinite(v) ? v : def
}

/** Timeout par tentative (ms). Décision/synthèse Yaye visent < 20 s. */
const TIMEOUT_MS = numEnv('YAYE_GROQ_TIMEOUT_MS', 20_000)
/** Nombre de retries automatiques (429/5xx/réseau) avant abandon. */
const MAX_RETRIES = numEnv('YAYE_GROQ_MAX_RETRIES', 2)

let _groq: Groq | null = null

/** Instance Groq singleton configurée avec timeout + retry. */
export function getGroq(): Groq {
  if (!_groq) {
    _groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
      timeout: TIMEOUT_MS,
      maxRetries: MAX_RETRIES,
    })
  }
  return _groq
}
