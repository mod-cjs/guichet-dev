// Calibration du juge LLM (P1-E, spec yaye-ats-tests-v4).
//
// Un juge LLM est un INSTRUMENT non validé : biais de verbosité, self-preference, bruit.
// Avant de se fier à ses notes, on mesure son ACCORD avec un gold humain (~40 réponses
// étiquetées). On ne garde comme fiable qu'un critère dont l'accord dépasse un seuil ;
// les autres sont reportés comme INDICATIFS. Fonctions PURES → testables en CI ; le gold
// humain est fourni par l'équipe (data), le scaffolding est ici.

/** Une paire (note du juge, note humaine) sur un même critère, échelle 0-5. */
export interface RatingPair {
  judge: number
  human: number
}

/** Accord exact (fraction de paires strictement égales). */
export function agreementRate(pairs: RatingPair[]): number {
  if (pairs.length === 0) return 0
  const eq = pairs.filter((p) => p.judge === p.human).length
  return Number((eq / pairs.length).toFixed(4))
}

/** Kappa de Cohen (nominal) : accord corrigé du hasard. 1 = parfait, 0 = niveau hasard, <0 = pire. */
export function cohenKappa(pairs: RatingPair[]): number {
  const n = pairs.length
  if (n === 0) return 0
  const po = agreementRate(pairs)
  // Probabilité d'accord attendue au hasard = Σ_k P(juge=k)·P(humain=k).
  const labels = new Set<number>()
  pairs.forEach((p) => { labels.add(p.judge); labels.add(p.human) })
  let pe = 0
  for (const k of labels) {
    const pj = pairs.filter((p) => p.judge === k).length / n
    const ph = pairs.filter((p) => p.human === k).length / n
    pe += pj * ph
  }
  if (pe === 1) return 1 // accord total et distributions dégénérées
  return Number(((po - pe) / (1 - pe)).toFixed(4))
}

/** Corrélation de Pearson (adaptée aux notes ordinales 0-5, capte l'accord « à un décalage près »). */
export function pearson(pairs: RatingPair[]): number {
  const n = pairs.length
  if (n === 0) return 0
  const mj = pairs.reduce((s, p) => s + p.judge, 0) / n
  const mh = pairs.reduce((s, p) => s + p.human, 0) / n
  let num = 0
  let dj = 0
  let dh = 0
  for (const p of pairs) {
    const a = p.judge - mj
    const b = p.human - mh
    num += a * b
    dj += a * a
    dh += b * b
  }
  if (dj === 0 || dh === 0) return 0 // variance nulle → corrélation indéfinie
  return Number((num / Math.sqrt(dj * dh)).toFixed(4))
}

export interface CalibrationResult {
  n: number
  agreement: number
  kappa: number
  correlation: number
  /** Fiable si l'accord corrigé OU la corrélation dépasse le seuil. Sinon : note INDICATIVE. */
  reliable: boolean
}

/**
 * Calibre un critère du juge contre le gold humain. Un critère est « fiable » si kappa ≥ kappaMin
 * OU corrélation ≥ corrMin (l'ordinal tolère un décalage systématique tant que le classement tient).
 */
export function calibrateJudge(
  pairs: RatingPair[],
  opts: { kappaMin?: number; corrMin?: number } = {},
): CalibrationResult {
  const kappaMin = opts.kappaMin ?? 0.6
  const corrMin = opts.corrMin ?? 0.7
  const kappa = cohenKappa(pairs)
  const correlation = pearson(pairs)
  return {
    n: pairs.length,
    agreement: agreementRate(pairs),
    kappa,
    correlation,
    reliable: pairs.length > 0 && (kappa >= kappaMin || correlation >= corrMin),
  }
}
