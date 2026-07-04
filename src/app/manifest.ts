import type { MetadataRoute } from 'next'

// GUIC-25 (M7 SEO / PWA) — manifest web. Couleurs littérales obligatoires
// (JSON manifest, non résolvable via var CSS) : gj-teal #009F76.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Guichet Jeunesse — Consortium Jeunesse Sénégal',
    short_name: 'Guichet Jeunesse',
    description:
      'Portail numérique du Consortium Jeunesse Sénégal — opportunités, formations, événements et ressources pour les jeunes.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#009F76',
    lang: 'fr',
    dir: 'ltr',
    categories: ['education', 'government', 'social'],
    icons: [
      { src: '/logo-guichet.png', sizes: 'any', type: 'image/png', purpose: 'any' },
    ],
  }
}
