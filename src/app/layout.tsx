import type { Metadata } from 'next'
import { MobileTopShell, MobileBottomShell } from '@/components/layout/MobileAppShell'
import { appUrl } from '@/lib/app-url'
import '@/styles/globals.css'

// GUIC-25 (M7 SEO) — metadataBase résout OG/canonical par page en URLs absolues.
export const metadata: Metadata = {
  metadataBase: new URL(appUrl()),
  title: {
    default: 'Guichet Jeunesse — CJS',
    template: '%s | Guichet Jeunesse CJS',
  },
  description: 'Portail numérique du Consortium Jeunesse Sénégal — Opportunités, formations, événements et ressources pour les jeunes.',
  keywords: ['jeunesse', 'sénégal', 'opportunités', 'emploi', 'formation', 'CJS'],
  applicationName: 'Guichet Jeunesse CJS',
  // NB : pas de `alternates.canonical` global — il serait hérité par toutes les
  // pages non surchargées et pointerait à tort vers l'accueil. Canonical défini
  // page par page (auto-référentiel).
  openGraph: {
    title: 'Guichet Jeunesse — CJS',
    description: 'Portail numérique du Consortium Jeunesse Sénégal',
    siteName: 'Guichet Jeunesse CJS',
    locale: 'fr_SN',
    type: 'website',
    // Image OG fournie par la convention fichier `app/opengraph-image.tsx` (1200×630).
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Guichet Jeunesse — CJS',
    description: 'Portail numérique du Consortium Jeunesse Sénégal',
    // Image Twitter fournie par `app/twitter-image.tsx`.
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body className="antialiased">
        {/* Top bar mobile : DOIT être avant {children} pour que sticky top-0 fonctionne */}
        <MobileTopShell />
        {children}
        {/* Bottom nav mobile : fixed bottom-0, après children */}
        <MobileBottomShell />
      </body>
    </html>
  )
}
