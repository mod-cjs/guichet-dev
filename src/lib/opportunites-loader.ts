import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import type {
  OpportuniteFiltres,
  OpportuniteListItem,
  OpportuniteListResult,
} from '@/types/opportunite'
import type { OpportuniteDetail } from '@/types/candidature'

/** Taille de page du catalogue public (règle CLAUDE.md : 20 items/page). */
export const PAGE_SIZE = 20

/** TTL du cache Redis de la liste (5 minutes). */
const CACHE_TTL_S = 300

/** Champs renvoyés sur une carte de liste — partagé avec l'API favoris. */
export const CARD_SELECT = {
  id: true,
  slug: true,
  titre: true,
  type: true,
  domaine: true,
  region: true,
  organisation: true,
  remuneration: true,
  deadline: true,
} satisfies Prisma.OpportuniteSelect

/** Forme brute d'une ligne (findMany select ou $queryRaw). */
interface RawRow {
  id: string
  slug: string
  titre: string
  type: string
  domaine: string
  region: string | null
  organisation: string
  remuneration: string | null
  deadline: Date | string | null
}

function toIso(value: Date | string | null): string | null {
  if (!value) return null
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

/** Projette une ligne brute (Prisma ou $queryRaw) en item de carte. */
export function toListItem(row: RawRow): OpportuniteListItem {
  return {
    id: row.id,
    slug: row.slug,
    titre: row.titre,
    type: row.type as OpportuniteListItem['type'],
    domaine: row.domaine as OpportuniteListItem['domaine'],
    region: (row.region as OpportuniteListItem['region']) ?? null,
    organisation: row.organisation,
    remuneration: row.remuneration ?? null,
    deadline: toIso(row.deadline),
  }
}

function cacheKey(f: OpportuniteFiltres): string {
  return [
    'opp:list',
    (f.q ?? '').trim().toLowerCase(),
    f.domaine ?? '',
    f.type ?? '',
    f.region ?? '',
    f.sortBy,
    f.page,
  ].join('|')
}

async function cacheGet(key: string): Promise<OpportuniteListResult | null> {
  try {
    const raw = await redis.get(key)
    return raw ? (JSON.parse(raw) as OpportuniteListResult) : null
  } catch (err) {
    logger.warn('[opportunites-loader] lecture cache Redis échouée', { err })
    return null
  }
}

async function cacheSet(key: string, value: OpportuniteListResult): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', CACHE_TTL_S)
  } catch (err) {
    logger.warn('[opportunites-loader] écriture cache Redis échouée', { err })
  }
}

/** Liste filtrée sans recherche plein-texte — requête Prisma standard. */
async function listFiltered(f: OpportuniteFiltres): Promise<OpportuniteListResult> {
  const where: Prisma.OpportuniteWhereInput = {
    statut: 'publiee',
    deletedAt: null,
    OR: [{ deadline: null }, { deadline: { gte: new Date() } }],
    ...(f.domaine ? { domaine: f.domaine } : {}),
    ...(f.type ? { type: f.type } : {}),
    ...(f.region ? { region: f.region } : {}),
  }

  // MySQL place les NULL en premier sur un ORDER BY ASC ; le « nulls last »
  // strict n'est appliqué que sur le chemin recherche ($queryRaw).
  const orderBy: Prisma.OpportuniteOrderByWithRelationInput[] =
    f.sortBy === 'deadline' ? [{ deadline: 'asc' }] : [{ createdAt: 'desc' }]

  const [rows, total] = await Promise.all([
    prisma.opportunite.findMany({
      where,
      select: CARD_SELECT,
      orderBy,
      skip: (f.page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.opportunite.count({ where }),
  ])

  return {
    items: (rows as RawRow[]).map(toListItem),
    total,
    page: f.page,
    pageSize: PAGE_SIZE,
  }
}

/**
 * Recherche plein-texte en BOOLEAN MODE.
 * Exception SQL brut tolérée (cf DECISIONS.md) : Prisma `search` ne pilote pas
 * le mode et la recherche natural-language de MariaDB est inopérante sur un
 * petit jeu de données (seuil 50 %).
 */
async function searchFulltext(f: OpportuniteFiltres): Promise<OpportuniteListResult> {
  const q = (f.q ?? '').trim()

  const conditions: Prisma.Sql[] = [
    Prisma.sql`statut = 'publiee'`,
    Prisma.sql`deleted_at IS NULL`,
    Prisma.sql`(deadline IS NULL OR deadline >= NOW())`,
    Prisma.sql`MATCH(titre, description) AGAINST (${q} IN BOOLEAN MODE)`,
  ]
  if (f.domaine) conditions.push(Prisma.sql`domaine = ${f.domaine}`)
  if (f.type) conditions.push(Prisma.sql`type = ${f.type}`)
  if (f.region) conditions.push(Prisma.sql`region = ${f.region}`)
  const whereSql = Prisma.join(conditions, ' AND ')

  const orderSql =
    f.sortBy === 'deadline'
      ? Prisma.sql`deadline IS NULL, deadline ASC`
      : Prisma.sql`created_at DESC`
  const offset = (f.page - 1) * PAGE_SIZE

  const rows = await prisma.$queryRaw<RawRow[]>(Prisma.sql`
    SELECT id, slug, titre, type, domaine, region, organisation, remuneration, deadline
    FROM opportunites
    WHERE ${whereSql}
    ORDER BY ${orderSql}
    LIMIT ${PAGE_SIZE} OFFSET ${offset}
  `)

  const countRows = await prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
    SELECT COUNT(*) AS total FROM opportunites WHERE ${whereSql}
  `)

  return {
    items: rows.map(toListItem),
    total: Number(countRows[0]?.total ?? 0),
    page: f.page,
    pageSize: PAGE_SIZE,
  }
}

/**
 * Catalogue public paginé : applique filtres, tri et recherche, avec cache
 * Redis 5 min. Le cache est anonyme — il ne porte aucun état favori.
 */
export async function listOpportunites(
  f: OpportuniteFiltres
): Promise<OpportuniteListResult> {
  const key = cacheKey(f)

  const cached = await cacheGet(key)
  if (cached) return cached

  const result = (f.q ?? '').trim()
    ? await searchFulltext(f)
    : await listFiltered(f)

  await cacheSet(key, result)
  return result
}

// ── Détail d'une opportunité (GUIC-21) ──────────────────────────────────────

const DETAIL_SELECT = {
  id: true,
  slug: true,
  titre: true,
  description: true,
  type: true,
  domaine: true,
  region: true,
  organisation: true,
  remuneration: true,
  deadline: true,
  lienExterne: true,
  vues: true,
} satisfies Prisma.OpportuniteSelect

/** Détail public d'une opportunité par slug, ou null si introuvable/non publiée. */
export async function getOpportuniteDetail(slug: string): Promise<OpportuniteDetail | null> {
  const o = await prisma.opportunite.findFirst({
    where: { slug, statut: 'publiee', deletedAt: null },
    select: DETAIL_SELECT,
  })
  if (!o) return null
  return { ...o, deadline: toIso(o.deadline) }
}

/**
 * Incrémente le compteur `vues`, best-effort et dédoublonné par IP.
 * Clé Redis `vue:<slug>:<ip>` TTL 30 min — l'incrément n'a lieu qu'à la
 * première vue de cette IP. N'échoue jamais (erreurs avalées).
 */
export async function incrementVue(slug: string, ip: string): Promise<void> {
  try {
    const firstView = await redis.set(`vue:${slug}:${ip}`, '1', 'EX', 1800, 'NX')
    if (firstView) {
      await prisma.opportunite.update({
        where: { slug },
        data: { vues: { increment: 1 } },
      })
    }
  } catch (err) {
    logger.warn('[opportunites-loader] incrément des vues échoué', { err })
  }
}
