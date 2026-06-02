import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { SkipLink } from '@/components/ui/SkipLink'

/**
 * Layout des pages app jeune.
 *
 * Mobile : AppTopbar + BottomNav sont rendus globalement par MobileAppShell
 * (cf src/app/layout.tsx) → pas de duplication ici.
 *
 * Desktop : Header marketing classique + Footer.
 */
export default async function JeuneLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  return (
    <>
      <SkipLink />
      {/* Desktop : header marketing + footer (mobile shell géré globalement) */}
      <div className="hidden md:block">
        <Header />
      </div>

      <main id="main" className="min-h-screen container-page py-space-5">
        {children}
      </main>

      <div className="hidden md:block">
        <Footer />
      </div>
    </>
  )
}
