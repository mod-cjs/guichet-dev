// Pipeline d'évaluation offline Yaye (GUIC-435 — jalon C).
// Échantillonnage STRATIFIÉ des sessions d'une fenêtre, jugement LLM, écriture des
// scores dans yaye_eval_scores. Conçu pour le cron nocturne `yaye-eval`.
//
// Stratification : 100 % des sessions escaladées/en erreur (les plus à risque) +
// échantillon aléatoire du reste, dans la limite du budget `sampleSize`.
// Seules les sessions avec TEXTE VERBATIM (WhatsApp) sont jugées sur la qualité ;
// le web (sans texte durable) est compté à part — voir la découverte de conception (spec §4).

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { reconstructTranscript } from './transcript'
import { judgeTranscript } from './judge'
import type { CanalAgent } from '@prisma/client'

export interface EvalRunOptions {
  from: Date
  to: Date
  /** Budget max de sessions jugées (défaut 50). */
  sampleSize?: number
  /** Délai entre deux jugements (ms) pour respecter le rate-limit du juge LLM. */
  delayMs?: number
}

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms))

export interface EvalRunReport {
  candidats: number
  evalues: number
  ignoresSansTexte: number
  drapeauxRouges: number
  erreurs: number
}

interface Candidat {
  sessionId: string
  canal: CanalAgent
  prioritaire: boolean // escaladée ou en erreur
}

/** Liste les sessions de la fenêtre avec leur canal et leur criticité. */
async function listerCandidats(from: Date, to: Date): Promise<Candidat[]> {
  const logs = await prisma.agentLog.findMany({
    where: { createdAt: { gte: from, lte: to } },
    select: { sessionId: true, canal: true, typeEvenement: true, statut: true },
  })
  const map = new Map<string, Candidat>()
  for (const l of logs) {
    let c = map.get(l.sessionId)
    if (!c) {
      c = { sessionId: l.sessionId, canal: l.canal, prioritaire: false }
      map.set(l.sessionId, c)
    }
    if (l.typeEvenement === 'escalade_conseiller' || l.typeEvenement === 'erreur' || l.statut === 'echec') {
      c.prioritaire = true
    }
  }
  return [...map.values()]
}

/** Mélange (Fisher-Yates) — Math.random autorisé en code serveur. */
function melanger<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export async function runEval(opts: EvalRunOptions): Promise<EvalRunReport> {
  const sampleSize = opts.sampleSize ?? 50
  const candidats = await listerCandidats(opts.from, opts.to)

  const prioritaires = candidats.filter((c) => c.prioritaire)
  const reste = melanger(candidats.filter((c) => !c.prioritaire))
  const budgetReste = Math.max(0, sampleSize - prioritaires.length)
  const choisis = [...prioritaires, ...reste.slice(0, budgetReste)]

  let evalues = 0
  let ignoresSansTexte = 0
  let drapeauxRouges = 0
  let erreurs = 0

  for (const c of choisis) {
    try {
      const transcript = await reconstructTranscript(c.sessionId)
      // La qualité (couche 3) exige le texte verbatim : web sans texte durable → ignoré.
      if (!transcript.hasVerbatimText) {
        ignoresSansTexte += 1
        continue
      }
      const score = await judgeTranscript(transcript)
      if (!score) {
        erreurs += 1
        continue
      }
      await prisma.yayeEvalScore.create({
        data: {
          sessionId: c.sessionId,
          tourIndex: null,
          juge: score.juge,
          fidelite: score.fidelite,
          pertinence: score.pertinence,
          utilite: score.utilite,
          persona: score.persona,
          conformiteCdp: score.conformiteCdp,
          langue: score.langue,
          drapeauRouge: score.drapeauRouge,
          commentaire: score.commentaire,
        },
      })
      evalues += 1
      if (score.drapeauRouge) drapeauxRouges += 1
    } catch (err) {
      erreurs += 1
      logger.warn('[yaye-eval] session échouée', { session: c.sessionId, err: String(err) })
    }
    if (opts.delayMs && opts.delayMs > 0) await sleep(opts.delayMs)
  }

  return { candidats: candidats.length, evalues, ignoresSansTexte, drapeauxRouges, erreurs }
}
