import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Page par défaut (règle CLAUDE.md : 20 items/page). */
export const PAGE_SIZE = 20

export type TypeEvenementValue = 'Formation' | 'Atelier' | 'Forum' | 'Webinar' | 'Conference'

export interface EvenementFiltres {
  /** Recherche plein-texte sur titre, description, lieu. */
  q?: string
  /** Filtre type (un seul). */
  type?: TypeEvenementValue
  /** Page (1-indexé). */
  page?: number
}

export interface EvenementListItem {
  id: string
  titre: string
  description: string
  type: TypeEvenementValue
  statut: 'a_venir' | 'en_cours' | 'termine' | 'annule'
  dateDebut: string // ISO
  dateFin: string | null
  lieu: string
  estGratuit: boolean
  capaciteMax: number | null
  organisation: string | null
}

export interface EvenementListResult {
  items: EvenementListItem[]
  total: number
  page: number
  pageSize: number
}

const CARD_SELECT = {
  id: true,
  titre: true,
  description: true,
  type: true,
  statut: true,
  dateDebut: true,
  dateFin: true,
  lieu: true,
  estGratuit: true,
  capaciteMax: true,
  centre: { select: { nom: true } },
} satisfies Prisma.EvenementSelect

/**
 * Liste paginée des événements publics à venir.
 * Tri : date de début ascendante. Exclut les événements terminés/annulés.
 */
export async function listEvenements(
  filtres: EvenementFiltres = {},
): Promise<EvenementListResult> {
  const page = Math.max(1, filtres.page ?? 1)
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.EvenementWhereInput = {
    statut: { in: ['a_venir', 'en_cours'] },
  }

  if (filtres.type) {
    where.type = filtres.type
  }

  if (filtres.q && filtres.q.trim()) {
    const q = filtres.q.trim()
    where.OR = [
      { titre: { contains: q } },
      { description: { contains: q } },
      { lieu: { contains: q } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.evenement.findMany({
      where,
      select: CARD_SELECT,
      orderBy: { dateDebut: 'asc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.evenement.count({ where }),
  ])

  const items: EvenementListItem[] = rows.map((r) => ({
    id: r.id,
    titre: r.titre,
    description: r.description,
    type: r.type as TypeEvenementValue,
    statut: r.statut as EvenementListItem['statut'],
    dateDebut:
      r.dateDebut instanceof Date ? r.dateDebut.toISOString() : new Date(r.dateDebut).toISOString(),
    dateFin: r.dateFin
      ? r.dateFin instanceof Date
        ? r.dateFin.toISOString()
        : new Date(r.dateFin).toISOString()
      : null,
    lieu: r.lieu,
    estGratuit: r.estGratuit,
    capaciteMax: r.capaciteMax,
    organisation: r.centre?.nom ?? null,
  }))

  return { items, total, page, pageSize: PAGE_SIZE }
}
