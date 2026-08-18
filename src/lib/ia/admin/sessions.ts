// Agrégation des sessions Yaye pour le panel admin (Lot 7 — suivi des logs).
// Spec : .agent_context/specs/yaye/06-agent-logs-tracabilite.md §51-58
//
// Lecture seule sur `agent_logs` (n'écrit rien). La liste regroupe les événements
// par `session_id` ; le détail réutilise `reconstructTranscript` (metrics/transcript.ts)
// pour les 2 niveaux Conversation / Technique.

import { prisma } from '@/lib/prisma'
import type { CanalAgent, Prisma } from '@prisma/client'

export interface SessionListFilters {
  from: Date
  to: Date
  canal?: CanalAgent
  role?: string
  centreId?: string
  /** Recherche sur cjs_uid ou session_id (contains). */
  q?: string
  /** Ne garder que les sessions avec au moins une erreur. */
  erreurOnly?: boolean
  /** Ne garder que les sessions ayant escaladé vers un conseiller. */
  escaladeOnly?: boolean
  /** Ne garder que les sessions au drapeau rouge qualité (hallucination / CDP). */
  drapeauOnly?: boolean
}

export interface SessionRow {
  sessionId: string
  canal: CanalAgent
  cjsUid: string | null
  role: string | null
  centreId: string | null
  debut: Date
  dureeMs: number
  nbTours: number
  nbEvents: number
  /** Outil principal de la session (premier appelé), si présent. Nommage honnête :
   *  c'est le premier OUTIL appelé, pas une intention détectée par un modèle. */
  outilPrincipal: string | null
  hasErreur: boolean
  hasEscalade: boolean
  /** Bénéficiaire résolu (prénom/nom) — null si anonyme. */
  user: { prenom: string; nom: string } | null
  /** Yaye Quality Score de la session (0-100) si déjà matérialisé, sinon null. */
  yqs: number | null
  /** Drapeau rouge qualité (hallucination / CDP) matérialisé. */
  drapeauRouge: boolean
  /** La session a abouti (réponse jugée résolutive) — depuis le résumé matérialisé. */
  resolu: boolean
  /** La session a produit une action métier (candidature / réservation). */
  converti: boolean
  /** Solde de feedback utilisateur (somme des notes +1 / -1) ; 0 si aucun retour. */
  feedback: number
}

export interface SessionListResult {
  rows: SessionRow[]
  total: number
}

const PAGE_SIZE = 20

function buildWhere(f: SessionListFilters): Prisma.AgentLogWhereInput {
  return {
    createdAt: { gte: f.from, lte: f.to },
    ...(f.canal ? { canal: f.canal } : {}),
    ...(f.role ? { role: f.role } : {}),
    ...(f.centreId ? { centreId: f.centreId } : {}),
    ...(f.q
      ? { OR: [{ cjsUid: { contains: f.q } }, { sessionId: { contains: f.q } }] }
      : {}),
  }
}

/**
 * Liste paginée des sessions Yaye, la plus récente d'abord.
 * 3 requêtes : groupBy (page) + count distinct + détail des événements de la page.
 */
export async function listSessions(
  f: SessionListFilters,
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<SessionListResult> {
  const baseWhere = buildWhere(f)

  // Filtres « escaladées » / « avec erreur » appliqués AU NIVEAU REQUÊTE (et non après
  // pagination) → la page et le total restent cohérents. On pré-calcule les sessionId
  // qualifiantes puis on borne le where dessus.
  let where = baseWhere
  if (f.drapeauOnly) {
    // Drapeau rouge = propriété du résumé matérialisé (pas d'agent_logs).
    const flagged = await prisma.yayeSessionSummary.findMany({
      where: { drapeauRouge: true },
      select: { sessionId: true },
    })
    where = { ...baseWhere, sessionId: { in: flagged.map((s) => s.sessionId) } }
  } else if (f.escaladeOnly || f.erreurOnly) {
    const matchWhere: Prisma.AgentLogWhereInput = {
      ...baseWhere,
      ...(f.escaladeOnly
        ? { typeEvenement: 'escalade_conseiller' }
        : { OR: [{ typeEvenement: 'erreur' }, { statut: 'echec' }] }),
    }
    const matching = await prisma.agentLog.groupBy({ by: ['sessionId'], where: matchWhere })
    where = { ...baseWhere, sessionId: { in: matching.map((m) => m.sessionId) } }
  }

  // Page de sessions : une ligne par (session, canal, user, centre, rôle) — ces champs
  // sont constants au sein d'une session, donc le groupBy rend bien une ligne/session.
  const groups = await prisma.agentLog.groupBy({
    by: ['sessionId', 'canal', 'cjsUid', 'centreId', 'role'],
    where,
    _min: { tsMs: true, createdAt: true },
    _max: { tsMs: true },
    _count: { _all: true },
    orderBy: { _min: { createdAt: 'desc' } },
    skip: (page - 1) * pageSize,
    take: pageSize,
  })

  // Total de sessions distinctes (pour la pagination).
  const distinct = await prisma.agentLog.groupBy({ by: ['sessionId'], where })
  const total = distinct.length

  const sessionIds = groups.map((g) => g.sessionId)
  const uids = [...new Set(groups.map((g) => g.cjsUid).filter((u): u is string => !!u))]

  // Détail léger des événements + enrichissements de page (qualité / feedback / identité).
  const [detail, summaries, feedbacks, users] = await Promise.all([
    sessionIds.length
      ? prisma.agentLog.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { sessionId: true, typeEvenement: true, statut: true, toolCalled: true },
          orderBy: [{ tsMs: 'asc' }, { createdAt: 'asc' }],
        })
      : Promise.resolve([]),
    sessionIds.length
      ? prisma.yayeSessionSummary.findMany({
          where: { sessionId: { in: sessionIds } },
          select: { sessionId: true, yqs: true, drapeauRouge: true, resolu: true, converti: true },
        })
      : Promise.resolve([]),
    sessionIds.length
      ? prisma.yayeFeedback.groupBy({ by: ['sessionId'], where: { sessionId: { in: sessionIds } }, _sum: { note: true } })
      : Promise.resolve([]),
    uids.length
      ? prisma.utilisateur.findMany({ where: { cjsUid: { in: uids } }, select: { cjsUid: true, prenom: true, nom: true } })
      : Promise.resolve([]),
  ])

  const bySession = new Map<string, typeof detail>()
  for (const d of detail) {
    const list = bySession.get(d.sessionId) ?? []
    list.push(d)
    bySession.set(d.sessionId, list)
  }
  const summaryBy = new Map(summaries.map((s) => [s.sessionId, s]))
  const feedbackBy = new Map(feedbacks.map((f) => [f.sessionId, f._sum.note ?? 0]))
  const userBy = new Map(users.map((u) => [u.cjsUid, u]))

  const rows: SessionRow[] = groups.map((g) => {
    const evs = bySession.get(g.sessionId) ?? []
    const nbTours = evs.filter((e) => e.typeEvenement === 'message_recu').length
    const hasErreur = evs.some((e) => e.statut === 'echec' || e.typeEvenement === 'erreur')
    const hasEscalade = evs.some((e) => e.typeEvenement === 'escalade_conseiller')
    const outilPrincipal =
      evs.find((e) => e.toolCalled)?.toolCalled ?? null
    const minMs = g._min.tsMs != null ? Number(g._min.tsMs) : null
    const maxMs = g._max.tsMs != null ? Number(g._max.tsMs) : null
    const sum = summaryBy.get(g.sessionId)
    const u = g.cjsUid ? userBy.get(g.cjsUid) : undefined
    return {
      sessionId: g.sessionId,
      canal: g.canal,
      cjsUid: g.cjsUid,
      role: g.role,
      centreId: g.centreId,
      debut: g._min.createdAt ?? new Date(0),
      dureeMs: minMs != null && maxMs != null ? Math.max(0, maxMs - minMs) : 0,
      nbTours,
      nbEvents: g._count._all,
      outilPrincipal,
      hasErreur,
      hasEscalade,
      user: u ? { prenom: u.prenom, nom: u.nom } : null,
      yqs: sum?.yqs ?? null,
      drapeauRouge: sum?.drapeauRouge ?? false,
      resolu: sum?.resolu ?? false,
      converti: sum?.converti ?? false,
      feedback: feedbackBy.get(g.sessionId) ?? 0,
    }
  })

  return { rows, total }
}

/**
 * Compteurs d'en-tête (sessions, escalades, erreurs) sur la fenêtre filtrée.
 * Le compteur `escalades` interroge `escaladeYaye` (même source que l'écran
 * escalades, cf. `lib/ia/admin/escalades.ts`) — pas `agent_logs` — pour que les
 * deux écrans comptent la même chose (GUIC-259 mineur).
 */
export async function sessionsSummary(
  f: SessionListFilters,
): Promise<{ sessions: number; escalades: number; erreurs: number }> {
  const where = buildWhere(f)
  const escaladeWhere: Prisma.EscaladeYayeWhereInput = {
    createdAt: { gte: f.from, lte: f.to },
    ...(f.canal ? { canal: f.canal } : {}),
    ...(f.role ? { role: f.role } : {}),
    ...(f.centreId ? { centreId: f.centreId } : {}),
  }
  const [distinct, escaladeSessions, erreurSessions] = await Promise.all([
    prisma.agentLog.groupBy({ by: ['sessionId'], where }),
    prisma.escaladeYaye.groupBy({ by: ['sessionId'], where: escaladeWhere }),
    prisma.agentLog.groupBy({
      by: ['sessionId'],
      where: { ...where, typeEvenement: 'erreur' },
    }),
  ])
  return {
    sessions: distinct.length,
    escalades: escaladeSessions.length,
    erreurs: erreurSessions.length,
  }
}
