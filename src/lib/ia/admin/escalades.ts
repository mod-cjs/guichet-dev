// File d'escalade Yaye → opérateur humain, côté admin (Lot 6).
// Lecture + mutation de l'ÉTAT de traitement (`escalades_yaye`).
// La trace événementielle (`agent_logs`) reste append-only, jamais mutée ici.

import { prisma } from '@/lib/prisma'
import type { CanalAgent, StatutEscalade, Prisma } from '@prisma/client'
import { echeanceSla, enRetardSla, whereEnRetardSla } from '@/lib/ia/escalade-sla'

export interface EscaladeListFilters {
  statut?: StatutEscalade
  canal?: CanalAgent
  centreId?: string
  /** Ne garder que les signalements de danger (signal_danger non nul). */
  dangerOnly?: boolean
  /** Ne garder que les escalades au-delà de leur SLA (non résolues, dérivé priorité+age). */
  lateOnly?: boolean
  /** Recherche libre : nom/prénom/téléphone du bénéficiaire OU identifiant de session. */
  q?: string
  /** Bornes de date de signalement (createdAt). */
  from?: Date
  to?: Date
}

/** Identité du bénéficiaire (pour contact, surtout sur un signalement de danger). */
export interface EscaladeUser {
  prenom: string
  nom: string
  telephone: string | null
}

export interface EscaladeRow {
  id: string
  sessionId: string
  cjsUid: string | null
  role: string | null
  centreId: string | null
  canal: CanalAgent
  raison: string | null
  stade: string | null
  /** Catégorie de DANGER repérée (violence, harcelement…) — null si escalade normale. */
  signalDanger: string | null
  priorite: number
  statut: StatutEscalade
  traitePar: string | null
  traiteA: Date | null
  /** GUIC-259 — note de clôture (ce qui a été fait / réponse humaine), si résolue. */
  resolutionNote: string | null
  createdAt: Date
  /** GUIC-259 — échéance de traitement (dérivée priorité+createdAt) et dépassement SLA. */
  echeanceSla: Date
  enRetardSla: boolean
  /** Bénéficiaire résolu (null si anonyme/non identifié). */
  user: EscaladeUser | null
}

export interface EscaladeListResult {
  rows: EscaladeRow[]
  total: number
  /** Compteurs par statut (pour les chips de filtre). */
  counts: Record<StatutEscalade, number>
}

const PAGE_SIZE = 20

export async function listEscalades(
  f: EscaladeListFilters,
  page = 1,
  pageSize = PAGE_SIZE,
): Promise<EscaladeListResult> {
  const now = new Date()
  // Critères hors statut (canal / centre / danger / retard SLA / dates / recherche) →
  // partagés par la liste ET les compteurs de chips, pour que ces derniers reflètent le
  // filtre courant (sauf le statut, que les chips sélectionnent). Les filtres à clés
  // DISTINCTES sont fusionnés à plat ; ceux produisant un `OR` (retard SLA, recherche)
  // vont dans un `AND` pour ne jamais s'écraser mutuellement.
  const q = f.q?.trim()
  const cjsUidMatch = q
    ? (await prisma.utilisateur.findMany({
        where: { OR: [{ prenom: { contains: q } }, { nom: { contains: q } }, { telephone: { contains: q } }] },
        select: { cjsUid: true },
        take: 200,
      })).map((u) => u.cjsUid)
    : []

  const flat: Prisma.EscaladeYayeWhereInput = {
    ...(f.canal ? { canal: f.canal } : {}),
    ...(f.centreId ? { centreId: f.centreId } : {}),
    ...(f.dangerOnly ? { signalDanger: { not: null } } : {}),
    ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lte: f.to } : {}) } } : {}),
  }
  const orClauses: Prisma.EscaladeYayeWhereInput[] = []
  if (f.lateOnly) orClauses.push(whereEnRetardSla(now))
  if (q) {
    orClauses.push({
      OR: [{ sessionId: { contains: q } }, ...(cjsUidMatch.length ? [{ cjsUid: { in: cjsUidMatch } }] : [])],
    })
  }
  const baseWhere: Prisma.EscaladeYayeWhereInput = orClauses.length ? { ...flat, AND: orClauses } : flat
  const where: Prisma.EscaladeYayeWhereInput = {
    ...baseWhere,
    ...(f.statut ? { statut: f.statut } : {}),
  }

  const [rows, total, grouped] = await Promise.all([
    prisma.escaladeYaye.findMany({
      where,
      // en_attente d'abord, puis les DANGERS en haut (priorite desc), puis les plus récentes.
      orderBy: [{ statut: 'asc' }, { priorite: 'desc' }, { createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.escaladeYaye.count({ where }),
    // Compteurs par statut respectant le filtre canal/centre/danger (pas le statut).
    prisma.escaladeYaye.groupBy({ by: ['statut'], where: baseWhere, _count: { _all: true } }),
  ])

  const counts: Record<StatutEscalade, number> = {
    en_attente: 0,
    prise_en_charge: 0,
    resolue: 0,
  }
  for (const g of grouped) counts[g.statut] = g._count._all

  // Résolution des bénéficiaires (prénom/nom/téléphone) pour le contact — une requête.
  const uids = [...new Set(rows.map((r) => r.cjsUid).filter((u): u is string => !!u))]
  const users = uids.length
    ? await prisma.utilisateur.findMany({
        where: { cjsUid: { in: uids } },
        select: { cjsUid: true, prenom: true, nom: true, telephone: true },
      })
    : []
  const userByUid = new Map(users.map((u) => [u.cjsUid, u]))

  const enriched: EscaladeRow[] = rows.map((r) => {
    const u = r.cjsUid ? userByUid.get(r.cjsUid) : undefined
    return {
      ...r,
      echeanceSla: echeanceSla(r.priorite, r.createdAt),
      enRetardSla: enRetardSla(r, now),
      user: u ? { prenom: u.prenom, nom: u.nom, telephone: u.telephone } : null,
    }
  })

  return { rows: enriched, total, counts }
}

/** Le statut visé a changé entre-temps (file partagée) — l'appelant doit rafraîchir. */
export class EscaladeConflictError extends Error {
  constructor(message = 'Statut de l’escalade modifié entre-temps') {
    super(message)
    this.name = 'EscaladeConflictError'
  }
}

/**
 * Met à jour le stade de traitement d'une escalade depuis le panel admin.
 * `traiteParCjsUid` = le conseiller/staff qui agit (renseigné quand on quitte `en_attente`).
 * `expectedFrom` (optionnel) = statut que l'opérateur voyait : garde de concurrence
 * optimiste sur une file partagée (si l'escalade a changé, on lève EscaladeConflictError
 * au lieu d'écraser en silence le travail d'un autre opérateur).
 */
export async function setEscaladeStatut(
  id: string,
  statut: StatutEscalade,
  traiteParCjsUid: string | null,
  resolutionNote?: string | null,
  expectedFrom?: StatutEscalade,
): Promise<void> {
  const data: Prisma.EscaladeYayeUpdateInput = {
    statut,
    // On horodate la prise en charge / résolution ; on l'efface si on revient en attente.
    traitePar: statut === 'en_attente' ? null : traiteParCjsUid,
    traiteA: statut === 'en_attente' ? null : new Date(),
  }
  // La note de clôture n'est ÉCRITE qu'à la résolution. À la réouverture on la CONSERVE
  // (historique du dernier traitement — jamais de perte silencieuse).
  if (statut === 'resolue') data.resolutionNote = resolutionNote?.trim() || null

  if (expectedFrom) {
    const res = await prisma.escaladeYaye.updateMany({ where: { id, statut: expectedFrom }, data })
    if (res.count === 0) throw new EscaladeConflictError()
    return
  }
  await prisma.escaladeYaye.update({ where: { id }, data })
}

/** Membre du staff assignable (conseiller / directeur), avec nom lisible. */
export interface YayeStaff {
  cjsUid: string
  nom: string
}

/** Staff pouvant traiter une escalade (conseillers + directeurs), pour la réassignation. */
export async function listYayeStaff(): Promise<YayeStaff[]> {
  const agents = await prisma.agentCentre.findMany({
    where: { role: { in: ['conseiller', 'directeur'] } },
    select: { cjsUid: true },
    distinct: ['cjsUid'],
    take: 300,
  })
  const uids = [...new Set(agents.map((a) => a.cjsUid))]
  if (uids.length === 0) return []
  const users = await prisma.utilisateur.findMany({
    where: { cjsUid: { in: uids } },
    select: { cjsUid: true, prenom: true, nom: true },
  })
  const nameByUid = new Map(users.map((u) => [u.cjsUid, `${u.prenom} ${u.nom}`.trim()]))
  return uids
    .map((cjsUid) => ({ cjsUid, nom: nameByUid.get(cjsUid) || `${cjsUid.slice(0, 8)}…` }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
}

/**
 * Assigne (ou réassigne) une escalade à un membre du staff : passe en `prise_en_charge`
 * avec `traitePar = assigneeCjsUid`. Garde de concurrence optionnelle (expectedFrom).
 */
export async function assignEscalade(
  id: string,
  assigneeCjsUid: string,
  expectedFrom?: StatutEscalade,
): Promise<void> {
  const data: Prisma.EscaladeYayeUpdateInput = {
    statut: 'prise_en_charge',
    traitePar: assigneeCjsUid,
    traiteA: new Date(),
  }
  if (expectedFrom) {
    const res = await prisma.escaladeYaye.updateMany({ where: { id, statut: expectedFrom }, data })
    if (res.count === 0) throw new EscaladeConflictError()
    return
  }
  await prisma.escaladeYaye.update({ where: { id }, data })
}
