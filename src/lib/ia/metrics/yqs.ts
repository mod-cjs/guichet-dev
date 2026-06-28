// Yaye Quality Score (GUIC-435 — jalon F). La « note » composite 0-100.
// Agrège les 5 couches en un score unique, APRÈS application des garde-fous
// NON COMPENSABLES : une fidélité (anti-hallucination) ou une conformité CDP sous
// le seuil plafonne le YQS et lève un drapeau rouge, quelle que soit la note globale.

import { prisma } from '@/lib/prisma'
import { computeRollups, type RollupFilters } from './rollups'
import { computeFeedbackKpis } from './feedback'
import { computeOutcomes } from './outcomes'
import type { CanalAgent, Prisma } from '@prisma/client'

const SEUIL_FIDELITE = Number(process.env.YAYE_SEUIL_FIDELITE ?? 0.6)
const SEUIL_CDP = Number(process.env.YAYE_SEUIL_CDP ?? 0.6)
/** Part de sessions au drapeau rouge qui déclenche la garde AU GLOBAL (défaut 10 %). */
const SEUIL_TAUX_DRAPEAU = Number(process.env.YAYE_SEUIL_TAUX_DRAPEAU ?? 0.1)
/** Plafond imposé au YQS quand un garde-fou est déclenché. */
const PLAFOND_DRAPEAU = 50

/**
 * Garde-fou GLOBAL (fonction pure) : sur une fenêtre, on ne peut pas se fier à la
 * MOYENNE de fidélité/CDP (une hallucination isolée est noyée). On déclenche donc
 * la garde sur le TAUX de sessions au drapeau rouge ; si dépassé, le YQS est plafonné.
 */
export function applyGlobalGuard(
  yqs: number | null,
  tauxDrapeauRouge: number,
  seuil = SEUIL_TAUX_DRAPEAU,
): { yqs: number | null; drapeauRouge: boolean; plafonne: boolean } {
  const drapeauRouge = tauxDrapeauRouge >= seuil
  if (drapeauRouge && yqs != null && yqs > PLAFOND_DRAPEAU) {
    return { yqs: PLAFOND_DRAPEAU, drapeauRouge, plafonne: true }
  }
  return { yqs, drapeauRouge, plafonne: false }
}

export interface LayerScores {
  operationnel: number | null
  efficacite: number | null
  qualite: number | null
  resultat: number | null
  satisfaction: number | null
}

/** Poids initiaux (calibrables). Somme = 1. */
export const DEFAULT_WEIGHTS: Record<keyof LayerScores, number> = {
  qualite: 0.35,
  resultat: 0.25,
  efficacite: 0.2,
  satisfaction: 0.15,
  operationnel: 0.05,
}

export interface YqsResult {
  yqs: number | null // 0-100, null si aucune couche dispo
  drapeauRouge: boolean
  plafonne: boolean
  couches: LayerScores
}

/**
 * Fonction PURE : combine les couches (chacune 0-1 ou null) en YQS 0-100.
 * Les couches nulles sont exclues et les poids renormalisés sur les couches présentes.
 */
export function computeYqs(
  couches: LayerScores,
  garde: { fidelite: number | null; conformiteCdp: number | null },
  weights: Record<keyof LayerScores, number> = DEFAULT_WEIGHTS,
): YqsResult {
  let sommePoids = 0
  let sommeScore = 0
  for (const k of Object.keys(couches) as (keyof LayerScores)[]) {
    const v = couches[k]
    if (v == null) continue
    sommePoids += weights[k]
    sommeScore += weights[k] * Math.min(1, Math.max(0, v))
  }
  if (sommePoids === 0) return { yqs: null, drapeauRouge: false, plafonne: false, couches }

  let yqs = (sommeScore / sommePoids) * 100

  // Garde-fous non compensables.
  const drapeauRouge =
    (garde.fidelite != null && garde.fidelite < SEUIL_FIDELITE) ||
    (garde.conformiteCdp != null && garde.conformiteCdp < SEUIL_CDP)
  let plafonne = false
  if (drapeauRouge && yqs > PLAFOND_DRAPEAU) {
    yqs = PLAFOND_DRAPEAU
    plafonne = true
  }

  return { yqs: Math.round(yqs * 10) / 10, drapeauRouge, plafonne, couches }
}

export interface QualityAggregates {
  count: number
  fidelite: number | null
  pertinence: number | null
  utilite: number | null
  persona: number | null
  conformiteCdp: number | null
  langue: number | null
  drapeauxRouges: number
}

/** Moyennes des dimensions du juge (couche 3) sur la fenêtre. */
export async function computeQualityAggregates(filters: {
  from?: Date
  to?: Date
} = {}): Promise<QualityAggregates> {
  const where: Prisma.YayeEvalScoreWhereInput = {}
  if (filters.from || filters.to) {
    where.createdAt = {}
    if (filters.from) where.createdAt.gte = filters.from
    if (filters.to) where.createdAt.lte = filters.to
  }
  const [agg, drapeauxRouges] = await Promise.all([
    prisma.yayeEvalScore.aggregate({
      where,
      _count: true,
      _avg: { fidelite: true, pertinence: true, utilite: true, persona: true, conformiteCdp: true, langue: true },
    }),
    prisma.yayeEvalScore.count({ where: { ...where, drapeauRouge: true } }),
  ])
  return {
    count: agg._count,
    fidelite: agg._avg.fidelite,
    pertinence: agg._avg.pertinence,
    utilite: agg._avg.utilite,
    persona: agg._avg.persona,
    conformiteCdp: agg._avg.conformiteCdp,
    langue: agg._avg.langue,
    drapeauxRouges,
  }
}

const moyenne = (...xs: (number | null)[]): number | null => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null
}

export interface YqsGlobal extends YqsResult {
  qualite: QualityAggregates
  /** Part de sessions jugées au drapeau rouge (0-1) — base de la garde globale. */
  tauxDrapeauRouge: number
}

/**
 * Calcule le YQS global de la fenêtre en agrégeant les 5 couches.
 * Normalisation de chaque couche en 0-1 (plus haut = meilleur).
 */
export async function computeYqsGlobal(filters: RollupFilters = {}): Promise<YqsGlobal> {
  const fb: { from?: Date; to?: Date; canal?: CanalAgent } = {
    from: filters.from,
    to: filters.to,
    canal: filters.canal,
  }
  const [rollups, feedback, outcomes, qualite] = await Promise.all([
    computeRollups(filters),
    computeFeedbackKpis(fb),
    computeOutcomes(fb),
    computeQualityAggregates({ from: filters.from, to: filters.to }),
  ])

  const couches: LayerScores = {
    operationnel: moyenne(rollups.tauxSuccesOutil, 1 - rollups.tauxErreurMoteur, 1 - rollups.tauxRequeteSeche),
    efficacite: moyenne(rollups.tauxConfinement, 1 - rollups.tauxAbandon),
    qualite: moyenne(
      qualite.fidelite,
      qualite.pertinence,
      qualite.utilite,
      qualite.persona,
      qualite.conformiteCdp,
      qualite.langue,
    ),
    resultat: outcomes.tauxConversionReco,
    satisfaction: feedback.csat,
  }

  // Score composite SANS garde par moyenne (la garde globale est basée sur le taux).
  const base = computeYqs(couches, { fidelite: null, conformiteCdp: null })
  const tauxDrapeauRouge = qualite.count ? qualite.drapeauxRouges / qualite.count : 0
  const garde = applyGlobalGuard(base.yqs, tauxDrapeauRouge)
  return {
    yqs: garde.yqs,
    drapeauRouge: garde.drapeauRouge,
    plafonne: garde.plafonne,
    couches: base.couches,
    qualite,
    tauxDrapeauRouge,
  }
}
