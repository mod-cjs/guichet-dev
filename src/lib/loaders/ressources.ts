import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Page par défaut (règle CLAUDE.md : 20 items/page). */
export const PAGE_SIZE = 20

export type TypeRessourceValue = 'PDF' | 'Video' | 'Lien' | 'Guide' | 'Outil'

export interface RessourceFiltres {
  q?: string
  type?: TypeRessourceValue
  page?: number
}

export interface RessourceListItem {
  id: string
  titre: string
  description: string
  type: TypeRessourceValue
  theme: string
  url: string
  vues: number
}

export interface RessourceListResult {
  items: RessourceListItem[]
  total: number
  page: number
  pageSize: number
}

const CARD_SELECT = {
  id: true,
  titre: true,
  description: true,
  type: true,
  theme: true,
  url: true,
  vues: true,
} satisfies Prisma.RessourceSelect

/**
 * Liste paginée des ressources publiques.
 * Tri : créées le plus récemment d'abord.
 */
export async function listRessources(
  filtres: RessourceFiltres = {},
): Promise<RessourceListResult> {
  const page = Math.max(1, filtres.page ?? 1)
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.RessourceWhereInput = {
    estPublic: true,
  }

  if (filtres.type) {
    where.type = filtres.type
  }

  if (filtres.q && filtres.q.trim()) {
    const q = filtres.q.trim()
    where.OR = [
      { titre: { contains: q } },
      { description: { contains: q } },
      { theme: { contains: q } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.ressource.findMany({
      where,
      select: CARD_SELECT,
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.ressource.count({ where }),
  ])

  const items: RessourceListItem[] = rows.map((r) => ({
    id: r.id,
    titre: r.titre,
    description: r.description,
    type: r.type as TypeRessourceValue,
    theme: r.theme,
    url: r.url,
    vues: r.vues,
  }))

  return { items, total, page, pageSize: PAGE_SIZE }
}
