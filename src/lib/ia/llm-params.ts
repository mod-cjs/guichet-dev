// GUIC-537 (Phase 3) — paramètres d'échantillonnage LLM pilotables par slot, MAIS bornés.
// Philosophie « pilotable dans des garde-fous » (comme l'allowlist de modèles) : l'admin règle
// température et max_tokens par usage, jamais hors bornes → aucune valeur ne peut casser la prod
// (temp > 1 rejetée par l'API, max_tokens démesuré = coût/troncature). Module PUR, testable.

import type { LlmSlot } from './supported-models'

export const TEMP_MIN = 0
export const TEMP_MAX = 1
export const TOKENS_MIN = 1
/** Plafond dur de max_tokens : au-delà = coût/latence inutiles et risque de troncature. */
export const TOKENS_MAX = 4096

export interface SlotParams {
  temperature: number
  maxTokens: number
}

/**
 * Défauts par slot = comportement historique (avant pilotage) :
 *  - agent : température de RÉPONSE (synthèse) chaleureuse ; la température de DÉCISION (routage
 *    d'outils) reste une constante code basse, NON pilotable (garde-fou correctness).
 *  - juge / adéquation : scoring déterministe (0 recommandé).
 */
export const DEFAULTS_PAR_SLOT: Record<LlmSlot, SlotParams> = {
  agent: { temperature: 0.6, maxTokens: 320 },
  judge: { temperature: 0, maxTokens: 400 },
  adequation: { temperature: 0, maxTokens: 200 },
}

function estFini(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v)
}

/** Borne une température dans [0,1] ; valeur non finie/null → `fallback`. */
export function clampTemp(v: number | null | undefined, fallback: number): number {
  if (!estFini(v)) return fallback
  return Math.min(TEMP_MAX, Math.max(TEMP_MIN, v))
}

/** Borne un max_tokens entier dans [1, TOKENS_MAX] ; valeur non finie/null → `fallback`. */
export function clampMaxTokens(v: number | null | undefined, fallback: number): number {
  if (!estFini(v)) return fallback
  return Math.min(TOKENS_MAX, Math.max(TOKENS_MIN, Math.floor(v)))
}

/** Résout les paramètres effectifs d'un slot : applique les défauts métier puis clampe. */
export function resoudreParams(
  slot: LlmSlot,
  raw: { temperature?: number | null; maxTokens?: number | null },
): SlotParams {
  const def = DEFAULTS_PAR_SLOT[slot]
  return {
    temperature: clampTemp(raw.temperature, def.temperature),
    maxTokens: clampMaxTokens(raw.maxTokens, def.maxTokens),
  }
}
