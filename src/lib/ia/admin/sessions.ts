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
  /** Outil/intention principal de la session (premier appelé), si présent. */
  intentionPrincipale: string | null
  hasErreur: boolean
  hasEscalade: boolean
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
  const where = buildWhere(f)

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
  // Détail léger des événements de la page → nbTours / statut / intention principale.
  const detail = sessionIds.length
    ? await prisma.agentLog.findMany({
        where: { sessionId: { in: sessionIds } },
        select: { sessionId: true, typeEvenement: true, statut: true, toolCalled: true },
        orderBy: [{ tsMs: 'asc' }, { createdAt: 'asc' }],
      })
    : []

  const bySession = new Map<string, typeof detail>()
  for (const d of detail) {
    const list = bySession.get(d.sessionId) ?? []
    list.push(d)
    bySession.set(d.sessionId, list)
  }

  let rows: SessionRow[] = groups.map((g) => {
    const evs = bySession.get(g.sessionId) ?? []
    const nbTours = evs.filter((e) => e.typeEvenement === 'message_recu').length
    const hasErreur = evs.some((e) => e.statut === 'echec' || e.typeEvenement === 'erreur')
    const hasEscalade = evs.some((e) => e.typeEvenement === 'escalade_conseiller')
    const intentionPrincipale =
      evs.find((e) => e.toolCalled)?.toolCalled ?? null
    const minMs = g._min.tsMs != null ? Number(g._min.tsMs) : null
    const maxMs = g._max.tsMs != null ? Number(g._max.tsMs) : null
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
      intentionPrincipale,
      hasErreur,
      hasEscalade,
    }
  })

  // Filtres post-agrégation (propriétés de session, pas de ligne).
  if (f.erreurOnly) rows = rows.filter((r) => r.hasErreur)
  if (f.escaladeOnly) rows = rows.filter((r) => r.hasEscalade)

  return { rows, total }
}

/** Compteurs d'en-tête (sessions, escalades, erreurs) sur la fenêtre filtrée. */
export async function sessionsSummary(
  f: SessionListFilters,
): Promise<{ sessions: number; escalades: number; erreurs: number }> {
  const where = buildWhere(f)
  const [distinct, escaladeSessions, erreurSessions] = await Promise.all([
    prisma.agentLog.groupBy({ by: ['sessionId'], where }),
    prisma.agentLog.groupBy({
      by: ['sessionId'],
      where: { ...where, typeEvenement: 'escalade_conseiller' },
    }),
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
