// Agrégation multi-run par catégorie + instantané golden pour l'admin (câblage runner).
// Pur et déterministe → testable en CI (le runner offline ne l'est pas).
//
// Politique par catégorie : les garde-fous de SÉCURITÉ ne se compensent pas → pass^k (unanime) ;
// la qualité tolère le bruit du LLM → majorité. Le snapshot alimente la clé Redis lue par le
// dashboard admin (`yaye:metrics:golden:last` → « Précision d'intention »).

import { HARD_FAIL_CATEGORIES, type EvalCategory } from './eval-suite'
import { aggregateRuns, type AggregationPolicy, type RunAggregation } from './stats'

/** pass^k pour les catégories HARD (sécurité), majorité sinon (qualité). */
export function policyForCategory(category: EvalCategory): AggregationPolicy {
  return HARD_FAIL_CATEGORIES.includes(category) ? 'powk' : 'majority'
}

/** Agrège les N résultats booléens d'un scénario selon la politique de sa catégorie. */
export function aggregateScenarioRuns(category: EvalCategory, passResults: boolean[]): RunAggregation {
  return aggregateRuns(passResults, policyForCategory(category))
}

/** Instantané écrit en Redis (clé `yaye:metrics:golden:last`) pour le pont admin. */
export interface GoldenSnapshot {
  version: string
  /** Précision d'intention (routage) 0-1 — champ lu par regression-data.ts. */
  precision: number
  corrects: number
  total: number
  at: string
}

/**
 * Construit l'instantané golden depuis les issues de ROUTAGE (une par scénario ayant un check
 * de routage). `at` est injecté par l'appelant (reste pur/testable, pas de Date interne).
 */
export function buildGoldenSnapshot(version: string, routingOutcomes: boolean[], at: string): GoldenSnapshot {
  const total = routingOutcomes.length
  const corrects = routingOutcomes.filter(Boolean).length
  return { version, precision: total ? Number((corrects / total).toFixed(4)) : 0, corrects, total, at }
}
