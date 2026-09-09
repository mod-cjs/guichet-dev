/**
 * Construction du sitemap (GUIC-102 / M7 SEO).
 *
 * `buildSitemapEntries` est pur (données → entrées) → testable sans DB.
 * `getSitemapEntries` charge depuis Prisma avec cache Redis 1h et dégradation
 * gracieuse (si Redis ou Prisma échoue, on renvoie au moins les pages statiques).
 */
import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/app-url'
import { prisma } from '@/lib/prisma'
import { lienMasque } from '@/lib/flags/ui'
import { masquesUtilisateur } from '@/lib/flags/ui-server'
import { redis } from '@/lib/redis'

type SitemapEntry = MetadataRoute.Sitemap[number]

const CACHE_KEY = 'seo:sitemap:v1'
const CACHE_TTL_SECONDS = 60 * 60 // 1 h (GUIC-102)

/** Pages statiques publiques indexables (chemins relatifs). */
export const STATIC_PATHS = [
  { path: '/', changeFrequency: 'daily' as const, priority: 1.0 },
  { path: '/opportunites', changeFrequency: 'daily' as const, priority: 0.9 },
  { path: '/agenda', changeFrequency: 'daily' as const, priority: 0.8 },
  { path: '/ressources', changeFrequency: 'weekly' as const, priority: 0.7 },
  { path: '/centres', changeFrequency: 'monthly' as const, priority: 0.6 },
  { path: '/legal/mentions-legales', changeFrequency: 'yearly' as const, priority: 0.2 },
  { path: '/legal/confidentialite', changeFrequency: 'yearly' as const, priority: 0.2 },
  { path: '/legal/cgu', changeFrequency: 'yearly' as const, priority: 0.2 },
]

export interface DynamicContent {
  opportunites: { slug: string; updatedAt: Date }[]
  evenements: { id: string; updatedAt: Date }[]
  ressources: { id: string; updatedAt: Date }[]
  centres: { slug: string; updatedAt: Date }[]
}

/** Assemble toutes les entrées du sitemap en URLs absolues. Pur, sans I/O. */
export function buildSitemapEntries(content: DynamicContent, now: Date): SitemapEntry[] {
  const base = appUrl()
  const abs = (path: string) => `${base}${path}`

  const entries: SitemapEntry[] = STATIC_PATHS.map((s) => ({
    url: abs(s.path),
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }))

  for (const o of content.opportunites) {
    entries.push({
      url: abs(`/opportunites/${o.slug}`),
      lastModified: o.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.7,
    })
  }
  for (const e of content.evenements) {
    entries.push({
      url: abs(`/agenda/${e.id}`),
      lastModified: e.updatedAt,
      changeFrequency: 'weekly',
      priority: 0.6,
    })
  }
  for (const r of content.ressources) {
    entries.push({
      url: abs(`/ressources/${r.id}`),
      lastModified: r.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }
  for (const c of content.centres) {
    entries.push({
      url: abs(`/centres/${c.slug}`),
      lastModified: c.updatedAt,
      changeFrequency: 'monthly',
      priority: 0.5,
    })
  }

  return entries
}

/** Charge le contenu dynamique publiable depuis Prisma. */
async function loadDynamicContent(): Promise<DynamicContent> {
  const [opportunites, evenements, ressources, centres] = await Promise.all([
    prisma.opportunite.findMany({
      where: { statut: 'publiee', deletedAt: null, NOT: { org: { statut: 'suspendue' } } }, // GUIC-705
      select: { slug: true, updatedAt: true },
    }),
    prisma.evenement.findMany({
      where: { statut: { in: ['a_venir', 'en_cours'] } },
      select: { id: true, updatedAt: true },
    }),
    prisma.ressource.findMany({
      where: { estPublic: true },
      select: { id: true, updatedAt: true },
    }),
    prisma.centre.findMany({
      where: { slug: { not: null } },
      select: { slug: true, updatedAt: true },
    }),
  ])
  return {
    opportunites,
    evenements,
    ressources,
    // `Centre.slug` est nullable en base — le filtre `not: null` ne raffine pas
    // le type Prisma, on écarte défensivement les entrées sans slug.
    centres: centres.flatMap((c) => (c.slug ? [{ slug: c.slug, updatedAt: c.updatedAt }] : [])),
  }
}

/** Sérialise/désérialise les entrées pour le cache Redis (dates → ISO). */
function serialize(entries: SitemapEntry[]): string {
  return JSON.stringify(entries)
}
function deserialize(raw: string): SitemapEntry[] {
  const parsed = JSON.parse(raw) as SitemapEntry[]
  return parsed.map((e) => ({
    ...e,
    lastModified: e.lastModified ? new Date(e.lastModified) : undefined,
  }))
}

/**
 * Retire les URL relevant d'une fonctionnalité masquée aux visiteurs.
 *
 * Le rattachement se fait sur le chemin, comme pour les navigations et le gate : les trois
 * surfaces tranchent ainsi avec la même règle, et une URL ne peut pas rester indexée
 * pendant que sa route répond 404.
 */
async function filtrerSitemap(entries: SitemapEntry[]): Promise<SitemapEntry[]> {
  const masques = await masquesUtilisateur(null)
  if (masques.length === 0) return entries
  const base = appUrl()
  return entries.filter((e) => !lienMasque(e.url.startsWith(base) ? e.url.slice(base.length) : e.url, masques))
}

/** Purge du cache — appelée après une bascule, sinon le sitemap garde jusqu'à 1 h de retard. */
export async function purgerCacheSitemap(): Promise<void> {
  try {
    await redis.del(CACHE_KEY)
  } catch {
    // Best-effort : le TTL rattrapera.
  }
}

/**
 * Entrées du sitemap avec cache Redis 1h. En cas d'échec Redis, on lit la DB ;
 * en cas d'échec DB, on renvoie au moins les pages statiques (jamais un 500).
 */
export async function getSitemapEntries(now: Date = new Date()): Promise<SitemapEntry[]> {
  try {
    const cached = await redis.get(CACHE_KEY)
    if (cached) return deserialize(cached)
  } catch {
    // Redis indisponible → on continue sans cache.
  }

  let content: DynamicContent = { opportunites: [], evenements: [], ressources: [], centres: [] }
  try {
    content = await loadDynamicContent()
  } catch {
    // DB indisponible → sitemap réduit aux pages statiques.
  }

  // GUIC-706 — le sitemap s'adresse aux moteurs, donc à la face `anonyme`. Laisser une
  // URL masquée y figurer ferait indexer puis visiter une page qui répond 404, et Google
  // continuerait d'y envoyer du trafic pendant des jours.
  const entries = await filtrerSitemap(buildSitemapEntries(content, now))

  try {
    await redis.set(CACHE_KEY, serialize(entries), 'EX', CACHE_TTL_SECONDS)
  } catch {
    // Écriture cache best-effort.
  }

  return entries
}
