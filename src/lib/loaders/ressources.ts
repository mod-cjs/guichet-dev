import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Page par défaut (règle CLAUDE.md : 20 items/page). */
export const PAGE_SIZE = 20

export type TypeRessourceValue = 'PDF' | 'Video' | 'Lien' | 'Guide' | 'Outil'
export type NiveauRessourceValue = 'Debutant' | 'Intermediaire' | 'Avance'
export type LangueRessourceValue = 'FR' | 'Wolof'
/** Bucket de date pour le filtre "récence" (GUIC-24). */
export type DateBucket = 'all' | 'recent' | 'year'

export interface RessourceFiltres {
  q?: string
  type?: TypeRessourceValue
  niveau?: NiveauRessourceValue
  langue?: LangueRessourceValue
  categorie?: string
  /** `recent` = 30 derniers jours ; `year` = année en cours. */
  date?: DateBucket
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
  niveau: NiveauRessourceValue | null
  langue: LangueRessourceValue | null
  categorie: string | null
  createdAt: string
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
  niveau: true,
  langue: true,
  categorie: true,
  createdAt: true,
} satisfies Prisma.RessourceSelect

/** Borne basse de date selon le bucket sélectionné. */
function dateLowerBound(bucket: DateBucket | undefined): Date | null {
  if (!bucket || bucket === 'all') return null
  if (bucket === 'recent') {
    const d = new Date()
    d.setDate(d.getDate() - 30)
    return d
  }
  // year : 1er janvier de l'année courante
  return new Date(new Date().getFullYear(), 0, 1)
}

/**
 * Liste paginée des ressources publiques.
 * Tri : créées le plus récemment d'abord.
 * GUIC-24 — filtres avancés (niveau, langue, catégorie, date).
 */
export async function listRessources(
  filtres: RessourceFiltres = {},
): Promise<RessourceListResult> {
  const page = Math.max(1, filtres.page ?? 1)
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.RessourceWhereInput = {
    estPublic: true,
  }

  if (filtres.type) where.type = filtres.type
  if (filtres.niveau) where.niveau = filtres.niveau
  if (filtres.langue) where.langue = filtres.langue
  if (filtres.categorie && filtres.categorie.trim()) where.categorie = filtres.categorie.trim()

  const dateMin = dateLowerBound(filtres.date)
  if (dateMin) where.createdAt = { gte: dateMin }

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
    niveau: (r.niveau ?? null) as NiveauRessourceValue | null,
    langue: (r.langue ?? null) as LangueRessourceValue | null,
    categorie: r.categorie ?? null,
    createdAt: r.createdAt.toISOString(),
  }))

  return { items, total, page, pageSize: PAGE_SIZE }
}

/** Liste paginée des ressources favoris d'un utilisateur (GUIC-24). */
export async function listRessourcesFavoris(
  cjsUid: string,
  page: number = 1,
): Promise<RessourceListResult> {
  const safePage = Math.max(1, page)
  const skip = (safePage - 1) * PAGE_SIZE

  const [favoris, total] = await Promise.all([
    prisma.ressourceFavorite.findMany({
      where: { cjsUid },
      orderBy: { createdAt: 'desc' },
      skip,
      take: PAGE_SIZE,
      select: { ressource: { select: CARD_SELECT } },
    }),
    prisma.ressourceFavorite.count({ where: { cjsUid } }),
  ])

  const items: RessourceListItem[] = favoris.map(({ ressource: r }) => ({
    id: r.id,
    titre: r.titre,
    description: r.description,
    type: r.type as TypeRessourceValue,
    theme: r.theme,
    url: r.url,
    vues: r.vues,
    niveau: (r.niveau ?? null) as NiveauRessourceValue | null,
    langue: (r.langue ?? null) as LangueRessourceValue | null,
    categorie: r.categorie ?? null,
    createdAt: r.createdAt.toISOString(),
  }))

  return { items, total, page: safePage, pageSize: PAGE_SIZE }
}

/** Set d'IDs favoris d'un utilisateur — pour synchroniser l'UI rapidement. */
export async function getRessourceFavoriIds(cjsUid: string): Promise<string[]> {
  const rows = await prisma.ressourceFavorite.findMany({
    where: { cjsUid },
    select: { ressourceId: true },
  })
  return rows.map((r) => r.ressourceId)
}
