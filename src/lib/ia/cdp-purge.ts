// Droit à l'oubli CDP — données Yaye (m12-ia, Lot 8).
// Le webhook SSO `user.anonymized` anonymise le compte, mais les traces Yaye
// conservaient des PII BRUTES au-delà de l'anonymisation :
//   - `agent_logs.payload.args` = arguments d'outils saisis par le jeune (motif de
//     réservation, lettre de motivation, requête de recherche libre…),
//   - transcripts verbatim, escalades (résumé), recommandations, scores du juge.
// Cette purge efface TOUTE la donnée Yaye d'un utilisateur, en base ET en Redis.
//
// Idempotent (deleteMany). `YayeEvalScore` n'a pas de cjs_uid → purgé via les
// sessionId de l'utilisateur (collectés depuis agent_logs + transcripts).

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { purgeUserContext } from './context'
import { purgeSummary } from './memory'

export interface YayePurgeResult {
  sessions: number
  agentLogs: number
  recommandations: number
  escalades: number
  feedback: number
  transcriptTurns: number
  sessionSummaries: number
  evalScores: number
}

/**
 * Efface toutes les données Yaye d'un utilisateur (droit à l'oubli CDP).
 * À appeler depuis le webhook SSO `user.anonymized`. Purge aussi la mémoire
 * conversationnelle Redis (contexte unifié + fiche long terme).
 */
export async function purgeYayeUserData(cjsUid: string): Promise<YayePurgeResult> {
  // 1. Sessions de l'utilisateur — nécessaires pour les tables indexées par
  //    sessionId seul (yaye_eval_scores) et pour rattraper les escalades/feedback
  //    enregistrés sans cjs_uid (« non identifié ») sur une session lui appartenant.
  const [logSessions, turnSessions] = await Promise.all([
    prisma.agentLog.findMany({ where: { cjsUid }, select: { sessionId: true }, distinct: ['sessionId'] }),
    prisma.yayeTranscriptTurn.findMany({ where: { cjsUid }, select: { sessionId: true }, distinct: ['sessionId'] }),
  ])
  const sessionIds = [...new Set([...logSessions, ...turnSessions].map((s) => s.sessionId))]

  // 2. Suppressions atomiques (par cjs_uid + par sessionId). `in: []` = no-op sûr.
  const [
    recommandations,
    agentLogs,
    escaladesUid,
    feedbackUid,
    transcriptTurns,
    summariesUid,
    evalScores,
    escaladesSess,
    feedbackSess,
    summariesSess,
  ] = await prisma.$transaction([
    prisma.recommandationIA.deleteMany({ where: { cjsUid } }),
    prisma.agentLog.deleteMany({ where: { cjsUid } }),
    prisma.escaladeYaye.deleteMany({ where: { cjsUid } }),
    prisma.yayeFeedback.deleteMany({ where: { cjsUid } }),
    prisma.yayeTranscriptTurn.deleteMany({ where: { cjsUid } }),
    prisma.yayeSessionSummary.deleteMany({ where: { cjsUid } }),
    prisma.yayeEvalScore.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.escaladeYaye.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.yayeFeedback.deleteMany({ where: { sessionId: { in: sessionIds } } }),
    prisma.yayeSessionSummary.deleteMany({ where: { sessionId: { in: sessionIds } } }),
  ])

  // 3. Mémoire conversationnelle Redis (fail-soft en interne).
  await purgeUserContext(cjsUid)
  await purgeSummary(cjsUid)

  const result: YayePurgeResult = {
    sessions: sessionIds.length,
    agentLogs: agentLogs.count,
    recommandations: recommandations.count,
    escalades: escaladesUid.count + escaladesSess.count,
    feedback: feedbackUid.count + feedbackSess.count,
    transcriptTurns: transcriptTurns.count,
    sessionSummaries: summariesUid.count + summariesSess.count,
    evalScores: evalScores.count,
  }
  logger.info('[yaye-cdp] purge données utilisateur', { ...result })
  return result
}
