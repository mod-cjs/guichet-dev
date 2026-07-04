import type { MetadataRoute } from 'next'
import { appUrl } from '@/lib/app-url'

// GUIC-25 (M7 SEO) — autorise les routes publiques, bloque les espaces privés
// et les surfaces techniques. Pointe les crawlers vers le sitemap.
export default function robots(): MetadataRoute.Robots {
  const base = appUrl()
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/jeune/',
          '/admin/',
          '/conseiller/',
          '/recruteur/',
          '/centre-staff/',
          '/api/',
          '/auth/',
          '/checkin/',
          '/apercu-partenaire/',
          '/design-preview/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  }
}
