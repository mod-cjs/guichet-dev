// Rigueur statistique du multi-run (P1-E, spec yaye-ats-tests-v4).
//
// Le non-déterminisme du LLM rend un run unique NON fiable. On rejoue chaque scénario N fois
// et on agrège selon une politique par catégorie :
//   • pass^k (unanime)  → SÉCURITÉ (danger/CDP/injection/grounding) : aucun échec toléré.
//   • majorité          → QUALITÉ : absorbe le bruit normal.
// On reporte AUSSI l'incertitude (intervalle de Wilson) et le flake rate — car « 3/3 » n'est
// pas une mesure de fiabilité, juste une décision. Fonctions PURES → testables en CI.

/** Intervalle de confiance de Wilson pour une proportion (plus honnête que Wald sur petit n). */
export interface Interval {
  estimate: number
  low: number
  high: number
}
export function wilsonInterval(successes: number, n: number, z = 1.96): Interval {
  if (n <= 0) return { estimate: 0, low: 0, high: 1 }
  const p = successes / n
  const z2 = z * z
  const denom = 1 + z2 / n
  const center = (p + z2 / (2 * n)) / denom
  const margin = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom
  return {
    estimate: Number(p.toFixed(4)),
    low: Number(Math.max(0, center - margin).toFixed(4)),
    high: Number(Math.min(1, center + margin).toFixed(4)),
  }
}

/** Taux de « flake » : 0 = runs unanimes, 1 = 50/50. = 2·min(p, 1−p). */
export function flakeRate(results: boolean[]): number {
  const n = results.length
  if (n === 0) return 0
  const p = results.filter(Boolean).length / n
  return Number((2 * Math.min(p, 1 - p)).toFixed(4))
}

export type AggregationPolicy = 'powk' | 'majority'

export interface RunAggregation {
  pass: boolean
  n: number
  passes: number
  passRate: number
  flakeRate: number
  interval: Interval
  policy: AggregationPolicy
}

/**
 * Agrège N runs booléens d'un même scénario.
 * `powk` : passe seulement si TOUS passent (garde sécurité, non-compensable).
 * `majority` : passe si strictement plus de la moitié passent.
 */
export function aggregateRuns(results: boolean[], policy: AggregationPolicy): RunAggregation {
  const n = results.length
  const passes = results.filter(Boolean).length
  const pass = policy === 'powk' ? n > 0 && passes === n : passes * 2 > n
  return {
    pass,
    n,
    passes,
    passRate: n ? Number((passes / n).toFixed(4)) : 0,
    flakeRate: flakeRate(results),
    interval: wilsonInterval(passes, n),
    policy,
  }
}

/**
 * Probabilité qu'un scénario passe le pass^k étant donné une fiabilité par-run `p` et `k` runs.
 * Sert à contextualiser : avec p=0.9 et k=3, on ne passe 3/3 que ~73 % du temps → un « 3/3 »
 * vert ne prouve pas p=1, et un échec isolé n'est pas forcément une régression.
 */
export function expectedPowKPassRate(perRunReliability: number, k: number): number {
  return Number(Math.pow(Math.min(1, Math.max(0, perRunReliability)), k).toFixed(4))
}
