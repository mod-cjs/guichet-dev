import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import { CookieConsent } from '@/components/consent/CookieConsent'
import { MobileTopShell, MobileBottomShell } from '@/components/layout/MobileAppShell'
import { OfflineBanner } from '@/components/ui'
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
  // Indexation par défaut : autorise les grandes vignettes (met en valeur l'OG
  // image) et les snippets complets sur les pages publiques. Les espaces privés
  // restent exclus via robots.ts + le noindex par page.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  // GUIC-106 — vérification Google Search Console : renseigner le token via
  // NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION (émis uniquement s'il est défini).
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
}

// GUIC-690 (design v5) — Lexend, police d'interface de la charte Yaakaar 2030.
// Self-hostée au build par next/font (zéro requête runtime vers Google — réseau
// intermittent + CSP). La variable alimente --gj-font-sans dans tokens.css,
// fallback stack système si le chargement échoue. É-06 au registre d'écarts.
const lexend = Lexend({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lexend',
})

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={lexend.variable}>
      <body className="antialiased">
        {/* GUIC-689 (Lot D) — bandeau hors-ligne : monté UNE fois ici plutôt
            qu'espace par espace (moins de points d'oubli, couvre aussi les
            écrans publics). Autonome : il ne rend rien tant que la connexion
            est présente. Public cible sur réseau intermittent. */}
        <OfflineBanner />
        {/* GUIC-712 — bandeau cookies : monté ici, et ici seulement. Un montage par
            espace laisserait un espace sans bandeau au premier oubli — c'est
            exactement ce qui s'est produit avec l'Article 7, qui promettait en
            production un consentement que personne n'avait posé. Autonome : ne rend
            rien tant qu'une décision courante existe. */}
        <CookieConsent />
        {/* Top bar mobile : DOIT être avant {children} pour que sticky top-0 fonctionne */}
        <MobileTopShell />
        {children}
        {/* Bottom nav mobile : fixed bottom-0, après children */}
        <MobileBottomShell />
      </body>
    </html>
  )
}
