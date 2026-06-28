// Top des intentions (sujets) des sessions Yaye — vue produit pour le dashboard.
// Source : `intention_princ` matérialisé dans yaye_session_summaries (cron nocturne).

import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

export interface IntentionCount {
  /** Nom d'outil (ex. search_opportunities) ou null = conversation sans outil. */
  intention: string | null
  count: number
}

/** Les intentions les plus fréquentes sur la fenêtre, décroissant. */
export async function computeTopIntentions(
  filters: { from?: Date; to?: Date } = {},
  limit = 6,
): Promise<IntentionCount[]> {
  const where: Prisma.YayeSessionSummaryWhereInput = {}
  if (filters.from || filters.to) {
    where.calculeLe = {}
    if (filters.from) where.calculeLe.gte = filters.from
    if (filters.to) where.calculeLe.lte = filters.to
  }
  const grouped = await prisma.yayeSessionSummary.groupBy({
    by: ['intentionPrinc'],
    where,
    _count: { _all: true },
  })
  return grouped
    .map((g) => ({ intention: g.intentionPrinc, count: g._count._all }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}
