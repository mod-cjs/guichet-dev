// File d'escalade Yaye → opérateur humain, côté admin (Lot 6).
// Lecture + mutation de l'ÉTAT de traitement (`escalades_yaye`).
// La trace événementielle (`agent_logs`) reste append-only, jamais mutée ici.

import { prisma } from '@/lib/prisma'
import type { CanalAgent, StatutEscalade, Prisma } from '@prisma/client'

export interface EscaladeListFilters {
  statut?: StatutEscalade
  canal?: CanalAgent
  centreId?: string
  /** Ne garder que les signalements de danger (signal_danger non nul). */
  dangerOnly?: boolean
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
  createdAt: Date
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
  // Critères hors statut (canal / centre / danger) → partagés par la liste ET les
  // compteurs de chips, pour que ces derniers reflètent le filtre courant (sauf le
  // statut, qui est justement ce que les chips sélectionnent).
  const baseWhere: Prisma.EscaladeYayeWhereInput = {
    ...(f.canal ? { canal: f.canal } : {}),
    ...(f.centreId ? { centreId: f.centreId } : {}),
    ...(f.dangerOnly ? { signalDanger: { not: null } } : {}),
  }
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
    return { ...r, user: u ? { prenom: u.prenom, nom: u.nom, telephone: u.telephone } : null }
  })

  return { rows: enriched, total, counts }
}

/**
 * Met à jour le stade de traitement d'une escalade depuis le panel admin.
 * `traiteParCjsUid` = le conseiller/staff qui agit (renseigné quand on quitte `en_attente`).
 */
export async function setEscaladeStatut(
  id: string,
  statut: StatutEscalade,
  traiteParCjsUid: string | null,
): Promise<void> {
  await prisma.escaladeYaye.update({
    where: { id },
    data: {
      statut,
      // On horodate la prise en charge / résolution ; on l'efface si on revient en attente.
      traitePar: statut === 'en_attente' ? null : traiteParCjsUid,
      traiteA: statut === 'en_attente' ? null : new Date(),
    },
  })
}
