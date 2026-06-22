// Résultat métier Yaye (GUIC-435 — jalon D, couche 4).
// Mesure l'impact réel des conversations via jointures agent_logs ↔ tables métier.
// LECTURE SEULE : aucune écriture dans les tables métier.

import { prisma } from '@/lib/prisma'
import type { CanalAgent, Prisma } from '@prisma/client'

export interface OutcomeFilters {
  from?: Date
  to?: Date
  canal?: CanalAgent
}

export interface OutcomeResult {
  /** Candidatures soumises via Yaye (tool submit_application confirmé). */
  candidaturesViaYaye: number
  /** Réservations soumises via Yaye (tool reserve_resource confirmé). */
  reservationsViaYaye: number
  /** Recommandations consultées (vuePar) sur la période. */
  recosVues: number
  /** Recos consultées ayant abouti à une candidature pour l'opportunité recommandée. */
  recosConverties: number
  /** Taux de conversion reco→candidature (0-1). Null si aucune reco vue. */
  tauxConversionReco: number | null
}

/** Compte les appels d'outil réussis sur la fenêtre. */
function toolCountWhere(filters: OutcomeFilters, tool: string): Prisma.AgentLogWhereInput {
  const where: Prisma.AgentLogWhereInput = {
    typeEvenement: 'api_appelee',
    toolCalled: tool,
    statut: 'succes',
  }
  if (filters.from || filters.to) {
    where.createdAt = {}
    if (filters.from) where.createdAt.gte = filters.from
    if (filters.to) where.createdAt.lte = filters.to
  }
  if (filters.canal) where.canal = filters.canal
  return where
}

export async function computeOutcomes(filters: OutcomeFilters = {}): Promise<OutcomeResult> {
  // Recommandations consultées sur la fenêtre (vuePar borné).
  const vueWhere: Prisma.RecommandationIAWhereInput = { opportuniteId: { not: null } }
  if (filters.from || filters.to) {
    vueWhere.vuePar = {}
    if (filters.from) (vueWhere.vuePar as Prisma.DateTimeFilter).gte = filters.from
    if (filters.to) (vueWhere.vuePar as Prisma.DateTimeFilter).lte = filters.to
  } else {
    vueWhere.vuePar = { not: null }
  }

  const [candidaturesViaYaye, reservationsViaYaye, recos] = await Promise.all([
    prisma.agentLog.count({ where: toolCountWhere(filters, 'submit_application') }),
    prisma.agentLog.count({ where: toolCountWhere(filters, 'reserve_resource') }),
    prisma.recommandationIA.findMany({ where: vueWhere, select: { cjsUid: true, opportuniteId: true } }),
  ])

  // Paires (cjsUid, opportuniteId) uniques des recos vues.
  const paires = new Map<string, { cjsUid: string; opportuniteId: string }>()
  for (const r of recos) {
    if (r.opportuniteId) paires.set(`${r.cjsUid}:${r.opportuniteId}`, { cjsUid: r.cjsUid, opportuniteId: r.opportuniteId })
  }
  const recosVues = paires.size

  // Conversion : ces paires ont-elles une candidature ? (unique [cjsUid, opportuniteId])
  let recosConverties = 0
  if (recosVues > 0) {
    const cands = await prisma.candidature.findMany({
      where: { OR: [...paires.values()] },
      select: { cjsUid: true, opportuniteId: true },
    })
    const candSet = new Set(cands.map((c) => `${c.cjsUid}:${c.opportuniteId}`))
    for (const key of paires.keys()) if (candSet.has(key)) recosConverties += 1
  }

  return {
    candidaturesViaYaye,
    reservationsViaYaye,
    recosVues,
    recosConverties,
    tauxConversionReco: recosVues > 0 ? recosConverties / recosVues : null,
  }
}
