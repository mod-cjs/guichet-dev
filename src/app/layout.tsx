import type { Metadata } from 'next'
import { Lexend } from 'next/font/google'
import { MobileTopShell, MobileBottomShell } from '@/components/layout/MobileAppShell'
import '@/styles/globals.css'

const lexend = Lexend({
  subsets: ['latin'],
  variable: '--font-lexend',
  display: 'swap',
})

export const metadata: Metadata = {
  title: {
    default: 'Guichet Jeunesse — CJS',
    template: '%s | Guichet Jeunesse CJS',
  },
  description: 'Portail numérique du Consortium Jeunesse Sénégal — Opportunités, formations, événements et ressources pour les jeunes.',
  keywords: ['jeunesse', 'sénégal', 'opportunités', 'emploi', 'formation', 'CJS'],
  openGraph: {
    title: 'Guichet Jeunesse — CJS',
    description: 'Portail numérique du Consortium Jeunesse Sénégal',
    locale: 'fr_SN',
    type: 'website',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={lexend.variable}>
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
