// GUIC-435 (Phase 2 — boucle qualité) — synthèse « intentions en échec ».
//
// On passe de MESURER (fréquence des intentions, computeTopIntentions) à AGIR : croiser
// l'intention principale d'une session avec ses ISSUES (résolu / escaladé / drapeau rouge /
// YQS) pour faire ressortir les sujets où Yaye échoue le plus. C'est le backlog
// d'amélioration : « les jeunes posent des questions sur X et Yaye s'en sort mal ».
//
// Source : `yaye_session_summaries` (matérialisé par le cron nocturne).

import { prisma } from '@/lib/prisma'

/** Agrégat brut par intention (compté en base). */
export interface IntentionAgg {
  intention: string
  total: number
  resolus: number
  escalades: number
  drapeauxRouges: number
  /** Somme des YQS des sessions scorées + nombre de sessions scorées (pour la moyenne honnête). */
  yqsSum: number
  yqsCount: number
}

/** Santé d'une intention, taux en % (0-100). `yqsMoyen` null si aucune session scorée. */
export interface IntentionSante {
  intention: string
  total: number
  tauxResolu: number
  tauxEscalade: number
  tauxDrapeauRouge: number
  yqsMoyen: number | null
  /** Score de risque (plus haut = pire) — sert au classement. */
  risque: number
}

const pct = (n: number, total: number): number => (total > 0 ? Math.round((n / total) * 1000) / 10 : 0)

/**
 * Transforme les agrégats bruts en santé par intention, du PIRE au meilleur.
 * Risque = manque de résolution + escalades + drapeaux (pondérés) — un sujet peu résolu,
 * souvent escaladé ou porteur de signaux rouges remonte en tête (à améliorer en priorité).
 */
export function synthetiserIntentions(
  aggs: IntentionAgg[],
  opts: { minVolume?: number } = {},
): IntentionSante[] {
  const minVolume = opts.minVolume ?? 1
  return aggs
    .filter((a) => a.intention.trim() !== '' && a.total >= minVolume)
    .map((a) => {
      const tauxResolu = pct(a.resolus, a.total)
      const tauxEscalade = pct(a.escalades, a.total)
      const tauxDrapeauRouge = pct(a.drapeauxRouges, a.total)
      const yqsMoyen = a.yqsCount > 0 ? Math.round(a.yqsSum / a.yqsCount) : null
      const risque = (100 - tauxResolu) + tauxEscalade + tauxDrapeauRouge * 2
      return { intention: a.intention, total: a.total, tauxResolu, tauxEscalade, tauxDrapeauRouge, yqsMoyen, risque }
    })
    .sort((a, b) => b.risque - a.risque)
}

/**
 * Calcule la santé par intention sur une fenêtre (défaut : 30 derniers jours), du pire au
 * meilleur. Plusieurs `groupBy` (les booléens ne se somment pas) fusionnés par intention.
 */
export async function computeIntentionsEnEchec(
  opts: { since?: Date; minVolume?: number } = {},
): Promise<IntentionSante[]> {
  const since = opts.since ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const base = { calculeLe: { gte: since }, intentionPrinc: { not: null } } as const

  const [totaux, resolus, escalades, drapeaux] = await Promise.all([
    prisma.yayeSessionSummary.groupBy({ by: ['intentionPrinc'], where: base, _count: { _all: true }, _avg: { yqs: true } }),
    prisma.yayeSessionSummary.groupBy({ by: ['intentionPrinc'], where: { ...base, resolu: true }, _count: { _all: true } }),
    prisma.yayeSessionSummary.groupBy({ by: ['intentionPrinc'], where: { ...base, escalade: true }, _count: { _all: true } }),
    prisma.yayeSessionSummary.groupBy({ by: ['intentionPrinc'], where: { ...base, drapeauRouge: true }, _count: { _all: true } }),
  ])
  const byIntent = (rows: { intentionPrinc: string | null; _count: { _all: number } }[]) =>
    new Map(rows.map((r) => [r.intentionPrinc ?? '', r._count._all]))
  const mResolus = byIntent(resolus)
  const mEscalades = byIntent(escalades)
  const mDrapeaux = byIntent(drapeaux)

  // YQS moyen : on n'a que la moyenne + le count par intention → reconstruit sum/count pour la fonction pure.
  const aggs: IntentionAgg[] = totaux.map((t) => {
    const intention = t.intentionPrinc ?? ''
    const total = t._count._all
    const yqsAvg = t._avg.yqs
    return {
      intention,
      total,
      resolus: mResolus.get(intention) ?? 0,
      escalades: mEscalades.get(intention) ?? 0,
      drapeauxRouges: mDrapeaux.get(intention) ?? 0,
      yqsSum: yqsAvg != null ? yqsAvg * total : 0,
      yqsCount: yqsAvg != null ? total : 0,
    }
  })
  return synthetiserIntentions(aggs, { minVolume: opts.minVolume })
}
