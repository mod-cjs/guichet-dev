// Harnais golden set Yaye (GUIC-435 — jalon E).
// `evaluateIntentPrecision` est PURE et déterministe (testable, CI).
// `runGoldenSet` injecte un runner (message → outils utilisés) → branché sur le vrai
// agent dans un script offline, ou sur un mock en test.

import { GOLDEN_SCENARIOS, GOLDEN_VERSION, type GoldenScenario } from './scenarios'

export interface IntentPrediction {
  id: string
  /** Outils réellement utilisés par l'agent pour ce scénario (ordre d'appel). */
  toolsUsed: string[]
}

export interface IntentMiss {
  id: string
  attendu: string | null
  obtenu: string | null
}

export interface IntentPrecisionResult {
  version: string
  total: number
  corrects: number
  precision: number // 0-1
  misses: IntentMiss[]
}

/** Le 1er outil utilisé (ou null si aucun) = l'intention détectée pour le scénario. */
function premierOutil(toolsUsed: string[]): string | null {
  return toolsUsed.length > 0 ? toolsUsed[0] : null
}

/**
 * Compare les prédictions aux attentes du golden set. Un scénario est correct si
 * le 1er outil utilisé == outil attendu (ou les deux null pour une réponse directe).
 */
export function evaluateIntentPrecision(
  predictions: IntentPrediction[],
  golden: GoldenScenario[] = GOLDEN_SCENARIOS,
): IntentPrecisionResult {
  const byId = new Map(predictions.map((p) => [p.id, p]))
  const misses: IntentMiss[] = []
  let corrects = 0

  for (const scenario of golden) {
    const pred = byId.get(scenario.id)
    const obtenu = pred ? premierOutil(pred.toolsUsed) : null
    if (obtenu === scenario.expectedTool) {
      corrects += 1
    } else {
      misses.push({ id: scenario.id, attendu: scenario.expectedTool, obtenu })
    }
  }

  return {
    version: GOLDEN_VERSION,
    total: golden.length,
    corrects,
    precision: golden.length > 0 ? corrects / golden.length : 0,
    misses,
  }
}

/** Runner injectable : exécute un message et renvoie les outils utilisés. */
export type GoldenRunner = (message: string) => Promise<string[]>

/** Exécute tout le golden set via le runner fourni puis évalue la précision. */
export async function runGoldenSet(
  runner: GoldenRunner,
  golden: GoldenScenario[] = GOLDEN_SCENARIOS,
): Promise<IntentPrecisionResult> {
  const predictions: IntentPrediction[] = []
  for (const scenario of golden) {
    try {
      const toolsUsed = await runner(scenario.message)
      predictions.push({ id: scenario.id, toolsUsed })
    } catch {
      predictions.push({ id: scenario.id, toolsUsed: [] })
    }
  }
  return evaluateIntentPrecision(predictions, golden)
}
