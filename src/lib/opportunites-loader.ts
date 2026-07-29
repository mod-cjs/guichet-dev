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
import { toOpportuniteDetailDTO, type OpportuniteRow } from '@/lib/opportunites/dto'

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

/**
 * Normalise un filtre `X | X[] | undefined` en `X[]` trié (clé cache stable)
 * ou `[]` si absent. GUIC-256 multi-select.
 */
function asArray<T extends string>(v: T | T[] | undefined): T[] {
  if (v === undefined) return []
  return (Array.isArray(v) ? v : [v]).slice().sort()
}

function cacheKey(f: OpportuniteFiltres): string {
  return [
    'opp:list',
    (f.q ?? '').trim().toLowerCase(),
    asArray(f.domaine).join(','),
    asArray(f.type).join(','),
    asArray(f.region).join(','),
    // GUIC-684 — sans le programme dans la clé, une recherche filtrée servirait le
    // résultat NON filtré mis en cache par la requête précédente.
    asArray(f.programme).join(','),
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

/** Longueur minimale d'un mot exploitable par l'index plein-texte MariaDB. */
const MIN_FULLTEXT_WORD = 4

/** Échappe les métacaractères LIKE (`\`, `%`, `_`). */
function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, '\\$&')
}

/** Au moins un mot ≥ 4 caractères → l'index plein-texte est exploitable. */
function fulltextUsable(q: string): boolean {
  return q.split(/\s+/).some((w) => w.length >= MIN_FULLTEXT_WORD)
}

/**
 * Liste paginée du catalogue via `$queryRaw`.
 * Exception SQL brut tolérée (cf DECISIONS.md) — deux limites de MariaDB que
 * Prisma ne sait pas piloter :
 *  - recherche plein-texte en BOOLEAN MODE ;
 *  - tri par échéance avec NULLS LAST (`ORDER BY deadline IS NULL, deadline`).
 * Requête entièrement paramétrée (aucune interpolation de chaîne).
 */
async function queryList(f: OpportuniteFiltres): Promise<OpportuniteListResult> {
  const conditions: Prisma.Sql[] = [
    Prisma.sql`statut = 'publiee'`,
    Prisma.sql`deleted_at IS NULL`,
    Prisma.sql`(deadline IS NULL OR deadline >= NOW())`,
  ]
  // GUIC-256 : multi-select via IN (...) si tableau, égalité si single.
  const domaines = asArray(f.domaine)
  if (domaines.length === 1) conditions.push(Prisma.sql`domaine = ${domaines[0]}`)
  else if (domaines.length > 1) conditions.push(Prisma.sql`domaine IN (${Prisma.join(domaines)})`)
  const types = asArray(f.type)
  if (types.length === 1) conditions.push(Prisma.sql`type = ${types[0]}`)
  else if (types.length > 1) conditions.push(Prisma.sql`type IN (${Prisma.join(types)})`)
  const regions = asArray(f.region)
  if (regions.length === 1) conditions.push(Prisma.sql`region = ${regions[0]}`)
  else if (regions.length > 1) conditions.push(Prisma.sql`region IN (${Prisma.join(regions)})`)

  // GUIC-684 — le rattachement aux programmes vit dans une table de jonction :
  // EXISTS plutôt qu'une jointure, pour ne pas dupliquer les lignes d'une
  // opportunité rattachée à plusieurs programmes (ni fausser le COUNT).
  const programmes = asArray(f.programme)
  if (programmes.length > 0) {
    const slugs =
      programmes.length === 1
        ? Prisma.sql`p.slug = ${programmes[0]}`
        : Prisma.sql`p.slug IN (${Prisma.join(programmes)})`
    conditions.push(Prisma.sql`EXISTS (
      SELECT 1 FROM opportunites_programmes op
      JOIN programmes p ON p.id = op.programme_id
      WHERE op.opportunite_id = opportunites.id AND ${slugs}
    )`)
  }

  const q = (f.q ?? '').trim()
  if (q) {
    if (fulltextUsable(q)) {
      conditions.push(Prisma.sql`MATCH(titre, description) AGAINST (${q} IN BOOLEAN MODE)`)
    } else {
      // Terme court (< 4 car.) : l'index plein-texte l'ignore → repli LIKE.
      const like = `%${escapeLike(q)}%`
      conditions.push(Prisma.sql`(titre LIKE ${like} OR description LIKE ${like})`)
    }
  }
  const whereSql = Prisma.join(conditions, ' AND ')

  // Tri « échéance » : NULLS LAST — les opportunités sans échéance en dernier.
  const orderSql =
    f.sortBy === 'deadline'
      ? Prisma.sql`deadline IS NULL, deadline ASC`
      : Prisma.sql`created_at DESC`
  const offset = (f.page - 1) * PAGE_SIZE

  const [rows, countRows] = await Promise.all([
    prisma.$queryRaw<RawRow[]>(Prisma.sql`
      SELECT id, slug, titre, type, domaine, region, organisation, remuneration, deadline
      FROM opportunites
      WHERE ${whereSql}
      ORDER BY ${orderSql}
      LIMIT ${PAGE_SIZE} OFFSET ${offset}
    `),
    prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`
      SELECT COUNT(*) AS total FROM opportunites WHERE ${whereSql}
    `),
  ])

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

  const result = await queryList(f)

  await cacheSet(key, result)
  return result
}

// ── Détail d'une opportunité (GUIC-21) ──────────────────────────────────────

/**
 * Include pour le détail — charge la table mère + relations polymorphiques
 * (GUIC-184 / 178c). Tant que la migration data (178d) n'est pas exécutée, les
 * sous-types et `typeRef` peuvent être null : le DTO gère le cas legacy.
 */
const DETAIL_INCLUDE = {
  typeRef: true,
  // GUIC-684 — rattachements aux programmes : sans cet include, le badge de la
  // fiche publique n'a rien à afficher. Le repli sur l'ancienne colonne masquait
  // l'oubli ; sa suppression le rend visible.
  programmes: { include: { programme: true } },
  emploi: true,
  stage: true,
  formation: true,
  bourse: true,
  concours: true,
  appelAProjets: true,
  financement: true,
  mentorat: true,
  mobilite: true,
  volontariat: true,
  skills: { include: { skill: true } },
  tags: { include: { tag: true } },
} satisfies Prisma.OpportuniteInclude

/** Détail public d'une opportunité par slug, ou null si introuvable/non publiée. */
export async function getOpportuniteDetail(slug: string): Promise<OpportuniteDetail | null> {
  const o = await prisma.opportunite.findFirst({
    where: { slug, statut: 'publiee', deletedAt: null },
    include: DETAIL_INCLUDE,
  })
  if (!o) return null
  return toOpportuniteDetailDTO(o as OpportuniteRow)
}

/**
 * Aperçu admin (modération) : charge une opportunité par `id` SANS filtre de
 * statut — un brouillon en attente de validation n'est pas `publiee`, donc
 * invisible via `getOpportuniteDetail`. Réservé aux pages admin gardées
 * (`isAdminRole`), pour permettre de prévisualiser AVANT d'approuver/rejeter.
 */
export async function getOpportuniteDetailForAdmin(id: string): Promise<OpportuniteDetail | null> {
  const o = await prisma.opportunite.findFirst({
    where: { id, deletedAt: null },
    include: DETAIL_INCLUDE,
  })
  if (!o) return null
  return toOpportuniteDetailDTO(o as OpportuniteRow)
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
