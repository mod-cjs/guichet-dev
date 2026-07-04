import type { MetadataRoute } from 'next'
import { getSitemapEntries } from '@/lib/seo/sitemap'

// GUIC-102 (M7 SEO) — /sitemap.xml dynamique : pages statiques + opportunités
// publiées + événements à venir + ressources publiques + centres. Cache Redis 1h
// géré dans getSitemapEntries. Revalidation ISR côté Next alignée sur le TTL.
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return getSitemapEntries()
}
