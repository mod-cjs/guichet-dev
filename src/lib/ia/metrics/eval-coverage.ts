// GUIC-435 (Phase 2) — couverture d'évaluation du juge.
//
// Le juge (cron `yaye-eval`) n'évalue qu'un ÉCHANTILLON stratifié des sessions (coût LLM) :
// une session non évaluée a `yqs = null` et s'affiche « — ». Sans dire clairement combien de
// sessions sont évaluées, ce « — » se lit à tort comme « qualité nulle ». On expose donc la
// couverture (évaluées / total) pour que l'absence de score soit lue comme « non évaluée ».

import { prisma } from '@/lib/prisma'

export interface EvalCoverage {
  total: number
  evaluees: number
  /** Pourcentage entier de sessions évaluées par le juge sur la fenêtre (0 si aucune session). */
  pct: number
}

export async function computeEvalCoverage(opts: { since?: Date } = {}): Promise<EvalCoverage> {
  const since = opts.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const where = { calculeLe: { gte: since } } as const
  const [total, evaluees] = await Promise.all([
    prisma.yayeSessionSummary.count({ where }),
    prisma.yayeSessionSummary.count({ where: { ...where, yqs: { not: null } } }),
  ])
  return { total, evaluees, pct: total > 0 ? Math.round((evaluees / total) * 100) : 0 }
}
