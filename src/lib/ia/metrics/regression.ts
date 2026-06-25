// Détection de régression Yaye (GUIC-435 — jalon E). Fonction PURE.
// Compare un instantané courant à une référence (baseline). Sert de garde de
// déploiement : alerte si le YQS, une dimension critique, ou la précision d'intention
// chute au-delà des seuils. Le YQS informe ; le golden set décide.

export interface YqsSnapshot {
  yqs: number | null // 0-100
  fidelite: number | null // 0-1
  conformiteCdp: number | null // 0-1
  intentPrecision: number | null // 0-1
}

export interface RegressionThresholds {
  yqs: number // points de YQS (0-100)
  critique: number // dimensions critiques (0-1)
  precision: number // précision d'intention (0-1)
}

export const DEFAULT_THRESHOLDS: RegressionThresholds = { yqs: 5, critique: 0.05, precision: 0.1 }

export interface RegressionResult {
  regressed: boolean
  raisons: string[]
  deltas: { yqs: number | null; fidelite: number | null; conformiteCdp: number | null; intentPrecision: number | null }
}

/** delta = courant - baseline (négatif = dégradation). Null si une valeur manque. */
function delta(courant: number | null, base: number | null): number | null {
  return courant != null && base != null ? courant - base : null
}

export function detectRegression(
  current: YqsSnapshot,
  baseline: YqsSnapshot,
  thresholds: RegressionThresholds = DEFAULT_THRESHOLDS,
): RegressionResult {
  const deltas = {
    yqs: delta(current.yqs, baseline.yqs),
    fidelite: delta(current.fidelite, baseline.fidelite),
    conformiteCdp: delta(current.conformiteCdp, baseline.conformiteCdp),
    intentPrecision: delta(current.intentPrecision, baseline.intentPrecision),
  }
  const raisons: string[] = []

  if (deltas.yqs != null && deltas.yqs < -thresholds.yqs) {
    raisons.push(`YQS en baisse de ${(-deltas.yqs).toFixed(1)} points`)
  }
  if (deltas.fidelite != null && deltas.fidelite < -thresholds.critique) {
    raisons.push(`Fidélité en baisse de ${(-deltas.fidelite).toFixed(2)} (critique)`)
  }
  if (deltas.conformiteCdp != null && deltas.conformiteCdp < -thresholds.critique) {
    raisons.push(`Conformité CDP en baisse de ${(-deltas.conformiteCdp).toFixed(2)} (critique)`)
  }
  if (deltas.intentPrecision != null && deltas.intentPrecision < -thresholds.precision) {
    raisons.push(`Précision d'intention en baisse de ${(-deltas.intentPrecision).toFixed(2)}`)
  }

  return { regressed: raisons.length > 0, raisons, deltas }
}
