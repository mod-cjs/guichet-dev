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
  /** Filtre catégorie unique (compat). */
  categorie?: string
  /** Filtre catégorie multi-select (GUIC-24 B1). Si fourni, prime sur `categorie`. */
  categories?: string[]
  /** `recent` = 30 derniers jours ; `year` = année en cours. */
  date?: DateBucket
  /** GUIC-684 — slug(s) de programme sectoriel de rattachement. */
  programmes?: string[]
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
  if (filtres.categories && filtres.categories.length) {
    where.categorie = { in: filtres.categories.map((c) => c.trim()).filter(Boolean) }
  } else if (filtres.categorie && filtres.categorie.trim()) {
    where.categorie = filtres.categorie.trim()
  }

  const dateMin = dateLowerBound(filtres.date)
  if (dateMin) where.createdAt = { gte: dateMin }

  // GUIC-684 — rattachement M:N : `some` (et non une jointure) pour qu'une ressource
  // rattachée à deux programmes n'apparaisse qu'une fois et que le COUNT reste juste.
  const programmes = (filtres.programmes ?? []).map((p) => p.trim()).filter(Boolean)
  if (programmes.length) {
    where.programmes = { some: { programme: { slug: { in: programmes } } } }
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

/** Détail complet d'une ressource — GUIC-363. */
export interface RessourceDetail extends RessourceListItem {
  updatedAt: string
}

const DETAIL_SELECT = {
  ...CARD_SELECT,
  updatedAt: true,
} satisfies Prisma.RessourceSelect

/**
 * Récupère une ressource publique par son identifiant.
 * GUIC-363 — Le modèle `Ressource` n'a pas de champ `slug` ; on adresse par
 * `id` (UUID). Si un futur champ slug est ajouté, cette fonction sera étendue.
 */
export async function getRessourceById(id: string): Promise<RessourceDetail | null> {
  if (!id || typeof id !== 'string') return null
  const r = await prisma.ressource.findFirst({
    where: { id, estPublic: true },
    select: DETAIL_SELECT,
  })
  if (!r) return null
  return {
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
    updatedAt: r.updatedAt.toISOString(),
  }
}

/**
 * Ressources liées : même thème (priorité) ou même catégorie, hors ressource
 * courante, max `take` items (défaut 3). GUIC-363.
 */
export async function getRessourcesRelated(
  ressourceId: string,
  take: number = 3,
): Promise<RessourceListItem[]> {
  const current = await prisma.ressource.findUnique({
    where: { id: ressourceId },
    select: { theme: true, categorie: true },
  })
  if (!current) return []

  const orClauses: Prisma.RessourceWhereInput[] = [{ theme: current.theme }]
  if (current.categorie) orClauses.push({ categorie: current.categorie })

  const rows = await prisma.ressource.findMany({
    where: {
      estPublic: true,
      id: { not: ressourceId },
      OR: orClauses,
    },
    select: CARD_SELECT,
    orderBy: { createdAt: 'desc' },
    take,
  })

  return rows.map((r) => ({
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
}

// GUIC-688 — `incrementRessourceVues` a été retiré : le comptage passe par
// `src/lib/analytics/consultations.ts`. Cette fonction incrémentait à CHAQUE
// rendu, sans dédoublonnage — le socle applique la même garde de 30 min que
// pour les autres entités, donc le compteur progresse désormais moins vite.
