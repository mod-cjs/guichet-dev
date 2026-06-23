// Feedback utilisateur Yaye (GUIC-435 — jalon B, couche 5 satisfaction).
// Écriture FAIL-SOFT dans `yaye_feedback` + calcul du CSAT.
// ⚠️ CDP : `raison` peut contenir des PII → minimisation + droit à l'oubli (cascade cjs_uid).

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { CanalAgent, Prisma } from '@prisma/client'

export interface FeedbackInput {
  sessionId: string
  cjsUid?: string | null
  canal: CanalAgent
  tourIndex?: number | null
  /** +1 (👍) ou -1 (👎). */
  note: 1 | -1
  raison?: string | null
}

/**
 * Enregistre un feedback. Ne lève jamais : un échec d'écriture ne doit pas
 * casser la conversation (invariant fail-soft, comme agent_logs).
 */
export async function recordFeedback(input: FeedbackInput): Promise<boolean> {
  try {
    await prisma.yayeFeedback.create({
      data: {
        sessionId: input.sessionId,
        cjsUid: input.cjsUid ?? null,
        canal: input.canal,
        tourIndex: input.tourIndex ?? null,
        note: input.note,
        raison: input.raison?.slice(0, 2000) ?? null,
      },
    })
    return true
  } catch (err) {
    logger.warn('[yaye-feedback] écriture échouée', { session: input.sessionId, err: String(err) })
    return false
  }
}

export interface FeedbackKpis {
  total: number
  positifs: number
  negatifs: number
  /** Customer Satisfaction : part de 👍 sur l'ensemble (0-1). Null si aucun feedback. */
  csat: number | null
}

export interface FeedbackFilters {
  from?: Date
  to?: Date
  canal?: CanalAgent
}

/** Calcule le CSAT sur la fenêtre/filtre donnés. */
export async function computeFeedbackKpis(filters: FeedbackFilters = {}): Promise<FeedbackKpis> {
  const where: Prisma.YayeFeedbackWhereInput = {}
  if (filters.from || filters.to) {
    where.createdAt = {}
    if (filters.from) where.createdAt.gte = filters.from
    if (filters.to) where.createdAt.lte = filters.to
  }
  if (filters.canal) where.canal = filters.canal

  const [positifs, negatifs] = await Promise.all([
    prisma.yayeFeedback.count({ where: { ...where, note: { gt: 0 } } }),
    prisma.yayeFeedback.count({ where: { ...where, note: { lt: 0 } } }),
  ])
  const total = positifs + negatifs
  return { total, positifs, negatifs, csat: total > 0 ? positifs / total : null }
}
