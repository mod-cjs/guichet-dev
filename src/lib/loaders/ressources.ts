import { Prisma } from '@prisma/client'
import { poidsFichierMemo } from '@/lib/ressources/poids-fichier'
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
  /**
   * GUIC-689 (Lot F2) — filtre exact par thème (`Ressource.theme`). Alimente
   * la navigation « Explorer par catégorie » de l'écran d'accueil médiathèque
   * (`categorie` n'est renseignée sur aucune ressource en base : `theme`,
   * lui, est obligatoire et rempli à 100 % — cf. `getRessourcesHome`).
   */
  theme?: string
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

type RessourceCardRow = Prisma.RessourceGetPayload<{ select: typeof CARD_SELECT }>

/** Mappe une row Prisma (`CARD_SELECT`) vers le DTO public `RessourceListItem`. */
function toListItem(r: RessourceCardRow): RessourceListItem {
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
  }
}

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
  if (filtres.theme && filtres.theme.trim()) where.theme = filtres.theme.trim()
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

  const items: RessourceListItem[] = rows.map(toListItem)

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

  const items: RessourceListItem[] = favoris.map(({ ressource: r }) => toListItem(r))

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
  /**
   * GUIC-709 — nombre de fichiers réellement emportés, compté sur la table
   * `Consultation` (événement `telechargement`). Calculé à la lecture plutôt
   * que dénormalisé : la fiche est le seul endroit qui l'affiche, et un
   * compteur en colonne finit toujours par diverger de sa source.
   */
  telechargements: number
  /**
   * GUIC-709 — poids relevé à la source, ou `null` si la source ne le déclare
   * pas ou reste injoignable. `null` signifie « non mesuré », jamais « vide » :
   * l'affichage doit se taire, pas montrer un zéro.
   */
  poidsOctets: number | null
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

  // GUIC-709 — les deux mesures de la fiche, en parallèle de rien d'autre :
  // aucune ne doit retarder l'autre, et aucune ne doit faire échouer la page.
  const [telechargements, poidsOctets] = await Promise.all([
    prisma.consultation.count({
      where: { typeEntite: 'ressource', entiteId: r.id, typeEvent: 'telechargement' },
    }),
    // Uniquement les PDF : c'est le seul type dont on sert le fichier, donc le
    // seul dont le poids veut dire quelque chose pour qui va le télécharger.
    r.type === 'PDF' ? poidsFichierMemo(r.url) : Promise.resolve(null),
  ])

  return {
    ...toListItem(r),
    updatedAt: r.updatedAt.toISOString(),
    telechargements,
    poidsOctets,
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

  return rows.map(toListItem)
}

// GUIC-688 — `incrementRessourceVues` a été retiré : le comptage passe par
// `src/lib/analytics/consultations.ts`. Cette fonction incrémentait à CHAQUE
// rendu, sans dédoublonnage — le socle applique la même garde de 30 min que
// pour les autres entités, donc le compteur progresse désormais moins vite.

// ─────────────────────────────────────────────────────────────────────────
// GUIC-689 (Lot F2) — écran d'accueil médiathèque (`ResHomeContent` design v5).
// ─────────────────────────────────────────────────────────────────────────

/** Thème (`Ressource.theme`) et nombre de ressources publiques associées. */
export interface RessourceCategorieCount {
  theme: string
  count: number
}

export interface RessourcesHomeData {
  /** Thèmes les plus représentés (`theme` — rempli à 100 %, contrairement à
   *  `categorie` qui n'est renseignée sur aucune ressource en base au
   *  30/07/2026 : cf. décision loader dans le rapport GUIC-689 Lot F2). */
  categories: RessourceCategorieCount[]
  /** Dernières ressources ajoutées (`createdAt` desc). Libellé honnête :
   *  il n'existe pas de champ `featured`/`misEnAvant` en base. */
  recentes: RessourceListItem[]
  /** Ressources les plus consultées (`vues` desc). Il n'existe AUCUN
   *  compteur de téléchargements — `vues` compte des consultations de la
   *  fiche détail (comptage dédoublonné par `lib/analytics/consultations.ts`
   *  depuis GUIC-688), jamais des téléchargements. */
  populaires: RessourceListItem[]
}

export interface RessourcesHomeOptions {
  /** Nombre d'items par étagère (défaut 10). */
  limit?: number
  /** Nombre de catégories affichées dans la grille (défaut 5). */
  categoriesLimit?: number
}

/**
 * Données de l'écran d'accueil médiathèque : 3 requêtes agrégées en
 * parallèle (pas de N+1 — aucune requête par item) :
 *  1. `groupBy(theme)` compté + trié desc → grille « Explorer par catégorie ».
 *  2. `findMany` trié `createdAt desc` → étagère « Ajoutées récemment ».
 *  3. `findMany` trié `vues desc, createdAt desc` → étagère « Les plus consultées ».
 *
 * Une unique requête SQL combinant les 3 nécessiterait du SQL brut (interdit
 * hors `DECISIONS.md`) : Prisma ne sait pas combiner un `groupBy` et deux
 * tris différents sur la table dans un seul appel.
 */
export async function getRessourcesHome(
  options: RessourcesHomeOptions = {},
): Promise<RessourcesHomeData> {
  const limit = options.limit ?? 10
  const categoriesLimit = options.categoriesLimit ?? 5
  const where: Prisma.RessourceWhereInput = { estPublic: true }

  const [categoryRows, recentRows, popularRows] = await Promise.all([
    prisma.ressource.groupBy({
      by: ['theme'],
      where,
      _count: { theme: true },
      orderBy: { _count: { theme: 'desc' } },
      take: categoriesLimit,
    }),
    prisma.ressource.findMany({
      where,
      select: CARD_SELECT,
      orderBy: { createdAt: 'desc' },
      take: limit,
    }),
    prisma.ressource.findMany({
      where,
      select: CARD_SELECT,
      orderBy: [{ vues: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    }),
  ])

  return {
    categories: categoryRows.map((r) => ({ theme: r.theme, count: r._count.theme })),
    recentes: recentRows.map(toListItem),
    populaires: popularRows.map(toListItem),
  }
}
