// File d'escalade Yaye → opérateur humain, côté admin (Lot 6).
// Lecture + mutation de l'ÉTAT de traitement (`escalades_yaye`).
// La trace événementielle (`agent_logs`) reste append-only, jamais mutée ici.

import { prisma } from '@/lib/prisma'
import type { CanalAgent, StatutEscalade, Prisma } from '@prisma/client'

export interface EscaladeListFilters {
  statut?: StatutEscalade
  canal?: CanalAgent
  centreId?: string
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
  statut: StatutEscalade
  traitePar: string | null
  traiteA: Date | null
  createdAt: Date
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
  const where: Prisma.EscaladeYayeWhereInput = {
    ...(f.statut ? { statut: f.statut } : {}),
    ...(f.canal ? { canal: f.canal } : {}),
    ...(f.centreId ? { centreId: f.centreId } : {}),
  }

  const [rows, total, grouped] = await Promise.all([
    prisma.escaladeYaye.findMany({
      where,
      orderBy: [{ statut: 'asc' }, { createdAt: 'desc' }], // en_attente d'abord, puis récentes
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.escaladeYaye.count({ where }),
    prisma.escaladeYaye.groupBy({ by: ['statut'], _count: { _all: true } }),
  ])

  const counts: Record<StatutEscalade, number> = {
    en_attente: 0,
    prise_en_charge: 0,
    resolue: 0,
  }
  for (const g of grouped) counts[g.statut] = g._count._all

  return { rows, total, counts }
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
