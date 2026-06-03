import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'

/**
 * Layout des pages app jeune.
 *
 * Mobile : AppTopbar + BottomNav sont rendus globalement par MobileAppShell
 * (cf src/app/layout.tsx) → pas de duplication ici.
 *
 * Desktop : Header marketing classique. Pas de footer marketing dans l'espace
 * jeune (GUIC-216) — l'app a sa propre identité, le footer corporate n'a pas
 * sa place ici.
 */
export default async function JeuneLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  return (
    <>
      {/* Desktop : header marketing (mobile shell géré globalement) */}
      <div className="hidden md:block">
        <Header />
      </div>

      <main id="main" className="min-h-screen container-page py-space-5">
        {children}
      </main>
    </>
  )
}
