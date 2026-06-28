// Alimentation de la calibration juge↔humain (GUIC-435 — R2).
// La fonction PURE `agreementByDimension` (calibration.ts) n'était branchée sur
// AUCUNE source de labels. Ici on la nourrit avec les sessions DOUBLEMENT notées
// stockées dans `yaye_eval_scores` :
//   - score JUGE   : ligne dont `juge` commence par "groq:" (cron yaye-eval),
//   - label HUMAIN : ligne dont `juge` commence par "humain:" (ex.
//     "humain:<conseillerUid>@rubric-v4"), insérée par un conseiller via le même
//     modèle (on AJOUTE, on ne modifie pas la table).
// Tant qu'aucune session n'est doublement notée, renvoie null (le dashboard
// affiche « en attente de labels humains »).

import { prisma } from '@/lib/prisma'
import { agreementByDimension, type AgreementResult, type DimScores } from './calibration'

/** Préfixe conventionnel du champ `juge` pour un label humain. */
export const HUMAN_JUDGE_PREFIX = 'humain:'
/** Version de rubrique alignée sur le juge LLM (judge.ts) pour un appariement propre. */
const RUBRIC_VERSION = 'rubric-v4'
const SEUIL_CRITIQUE = 0.6

export interface HumanLabelInput {
  sessionId: string
  /** cjs_uid du conseiller/admin qui note (trace dans le champ `juge`). */
  raterCjsUid: string
  scores: DimScores
  commentaire?: string | null
}

/**
 * Enregistre un label HUMAIN d'une session (ligne yaye_eval_scores préfixée
 * « humain: ») → alimente la calibration juge↔humain. On AJOUTE une ligne, on ne
 * modifie aucun score du juge.
 */
export async function recordHumanLabel(input: HumanLabelInput): Promise<void> {
  const s = input.scores
  const juge = `${HUMAN_JUDGE_PREFIX}${input.raterCjsUid}@${RUBRIC_VERSION}`
  // Idempotence : une re-notation par le MÊME conseiller remplace la précédente
  // (sinon la table accumule des labels et computeCalibration n'en garde qu'un).
  await prisma.$transaction([
    prisma.yayeEvalScore.deleteMany({ where: { sessionId: input.sessionId, juge } }),
    prisma.yayeEvalScore.create({
      data: {
        sessionId: input.sessionId,
        tourIndex: null,
        juge,
        fidelite: s.fidelite,
        pertinence: s.pertinence,
        utilite: s.utilite,
        persona: s.persona,
        conformiteCdp: s.conformiteCdp,
        langue: s.langue,
        drapeauRouge: s.fidelite < SEUIL_CRITIQUE || s.conformiteCdp < SEUIL_CRITIQUE,
        commentaire: input.commentaire ?? null,
      },
    }),
  ])
}

export interface CalibrationReport extends AgreementResult {
  /** Nombre de (session, tour) notés à la fois par un humain ET par le juge. */
  pairs: number
}

interface ScoreRow {
  sessionId: string
  tourIndex: number | null
  juge: string
  fidelite: number
  pertinence: number
  utilite: number
  persona: number
  conformiteCdp: number
  langue: number
}

function toDims(r: ScoreRow): DimScores {
  return {
    fidelite: r.fidelite,
    pertinence: r.pertinence,
    utilite: r.utilite,
    persona: r.persona,
    conformiteCdp: r.conformiteCdp,
    langue: r.langue,
  }
}

/**
 * Accord juge↔humain par dimension (Cohen's kappa) sur la fenêtre. Apparie le
 * label humain et le score juge de la MÊME (sessionId, tourIndex). Renvoie null
 * si aucune session n'est doublement notée.
 */
export async function computeCalibration(): Promise<CalibrationReport | null> {
  // PAS de filtre par date : le label humain est saisi des jours après la session
  // et le score juge la nuit suivante → un filtre `createdAt` les séparerait souvent
  // et sous-estimerait le kappa. La calibration est une mesure de qualité du juge,
  // pas une métrique de période — on apparie TOUTES les paires existantes.
  const rows = (await prisma.yayeEvalScore.findMany({
    select: {
      sessionId: true, tourIndex: true, juge: true,
      fidelite: true, pertinence: true, utilite: true, persona: true, conformiteCdp: true, langue: true,
    },
  })) as ScoreRow[]

  // Regroupe par (session, tour) ; garde le dernier de chaque source.
  const byKey = new Map<string, { h?: DimScores; j?: DimScores }>()
  for (const r of rows) {
    const key = `${r.sessionId}#${r.tourIndex ?? 'all'}`
    const slot = byKey.get(key) ?? {}
    if (r.juge.startsWith(HUMAN_JUDGE_PREFIX)) slot.h = toDims(r)
    else slot.j = toDims(r)
    byKey.set(key, slot)
  }

  const human: DimScores[] = []
  const judge: DimScores[] = []
  for (const { h, j } of byKey.values()) {
    if (h && j) { human.push(h); judge.push(j) }
  }

  if (human.length === 0) return null
  return { ...agreementByDimension(human, judge), pairs: human.length }
}
