// Matérialisation des métriques Yaye (GUIC-435 — jalon F).
// Écrit 1 ligne par session dans `yaye_session_summaries` : métriques structurelles
// (tours, durée, escalade, résolu, converti) + YQS par session + drapeau rouge.
// Alimenté par le cron yaye-eval (après jugement) ou un run manuel. Lecture seule
// sur agent_logs / eval / feedback ; n'écrit QUE dans yaye_session_summaries.

import { prisma } from '@/lib/prisma'
import { reconstructTranscript } from './transcript'
import { computeYqs } from './yqs'

export interface MaterializeFilters {
  from?: Date
  to?: Date
}
export interface MaterializeReport {
  sessions: number
  ecrits: number
  drapeauxRouges: number
}

async function listSessionIds(filters: MaterializeFilters): Promise<string[]> {
  const where = filters.from || filters.to ? { createdAt: { gte: filters.from, lte: filters.to } } : {}
  const rows = await prisma.agentLog.findMany({ where, select: { sessionId: true }, distinct: ['sessionId'] })
  return rows.map((r) => r.sessionId)
}

/** Matérialise/rafraîchit le résumé d'une session. Renvoie true si drapeau rouge. */
async function materializeOne(sessionId: string): Promise<boolean | null> {
  const t = await reconstructTranscript(sessionId)
  if (!t.canal) return null

  // Couche 1-2 (structurel) depuis les événements de la session.
  const api = t.events.filter((e) => e.type === 'api_appelee')
  const apiSucces = api.filter((e) => e.statut === 'succes').length
  const tauxSucces = api.length ? apiSucces / api.length : 1
  const erreur = t.events.some((e) => e.type === 'erreur')
  const aReponse = t.events.some((e) => e.type === 'reponse_generee' || e.type === 'contenu_transmis')
  const operationnel = erreur ? Math.min(tauxSucces, 0.5) : tauxSucces
  const efficacite = aReponse ? 1 : 0

  // Couche 3 (qualité) depuis le dernier score du juge.
  const ev = await prisma.yayeEvalScore.findFirst({ where: { sessionId }, orderBy: { createdAt: 'desc' } })
  const qualite = ev
    ? (ev.fidelite + ev.pertinence + ev.utilite + ev.persona + ev.conformiteCdp + ev.langue) / 6
    : null

  // Couche 5 (satisfaction) depuis le feedback de la session.
  const fbs = await prisma.yayeFeedback.findMany({ where: { sessionId }, select: { note: true } })
  const satisfaction = fbs.length ? fbs.filter((f) => f.note > 0).length / fbs.length : null

  const res = computeYqs(
    { operationnel, efficacite, qualite, resultat: null, satisfaction },
    { fidelite: ev?.fidelite ?? null, conformiteCdp: ev?.conformiteCdp ?? null },
  )

  const converti = t.events.some(
    (e) =>
      e.type === 'api_appelee' &&
      e.statut === 'succes' &&
      (e.toolCalled === 'submit_application' || e.toolCalled === 'reserve_resource'),
  )
  const intentionPrinc =
    t.turns.flatMap((x) => x.toolsUsed)[0] ?? t.turns.flatMap((x) => x.intentions)[0] ?? null

  const data = {
    cjsUid: t.cjsUid,
    centreId: t.centreId,
    canal: t.canal,
    nbTours: t.nbTours,
    dureeMs: t.dureeMs,
    escalade: t.escalade,
    resolu: aReponse && !t.escalade,
    converti,
    yqs: res.yqs,
    drapeauRouge: res.drapeauRouge,
    intentionPrinc,
    calculeLe: new Date(),
  }
  await prisma.yayeSessionSummary.upsert({
    where: { sessionId },
    create: { sessionId, ...data },
    update: data,
  })
  return res.drapeauRouge
}

/** Matérialise les résumés de toutes les sessions de la fenêtre. */
export async function materializeSummaries(filters: MaterializeFilters = {}): Promise<MaterializeReport> {
  const ids = await listSessionIds(filters)
  let ecrits = 0
  let drapeauxRouges = 0
  for (const id of ids) {
    const flag = await materializeOne(id)
    if (flag === null) continue
    ecrits += 1
    if (flag) drapeauxRouges += 1
  }
  return { sessions: ids.length, ecrits, drapeauxRouges }
}
