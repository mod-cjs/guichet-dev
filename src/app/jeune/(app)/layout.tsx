import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { SkipLink } from '@/components/ui/SkipLink'
import { BenefSidebar } from '@/components/layout/BenefSidebar'
import { BenefTopBar } from '@/components/layout/BenefTopBar'

/**
 * Layout des pages app jeune.
 *
 * Mobile (<md) : AppTopbar + BottomNav rendus globalement par MobileAppShell
 * (cf src/app/layout.tsx) — pas de duplication ici.
 *
 * Tablet [md, lg) : Header marketing (transition).
 *
 * Desktop (≥lg) : layout 2 colonnes — BenefSidebar gauche (260px, sticky)
 * + BenefTopBar haut (sticky) + contenu. C'est le shell web bénéficiaire
 * v2 (cf `design-guichet-v2/web-dashboard.jsx`). GUIC-205-A.
 *
 * Footer marketing retiré du layout app jeune (GUIC-216) — l'espace jeune a
 * sa propre identité, le footer corporate n'a pas sa place ici.
 */
export default async function JeuneLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const userInitials =
    (session.prenom?.[0] ?? '').toUpperCase() +
    (session.nom?.[0] ?? '').toUpperCase()
  const userName = `${session.prenom ?? ''} ${session.nom ?? ''}`.trim()
  const userMeta = session.region ?? undefined

  return (
    <>
      <SkipLink />
      <div className="lg:grid lg:min-h-screen" style={{ gridTemplateColumns: '260px 1fr' }}>
        {/* Sidebar desktop (≥lg) */}
        <div className="hidden lg:block sticky top-0 h-screen">
          <BenefSidebar
            userName={userName || undefined}
            userMeta={userMeta}
            userInitials={userInitials || undefined}
          />
        </div>

        {/* Colonne droite (desktop) / flow normal (mobile/tablet) */}
        <div className="flex flex-col min-w-0">
          {/* Top bar desktop (≥lg) */}
          <BenefTopBar
            userInitials={userInitials || undefined}
            userPrenom={session.prenom ?? undefined}
            userNom={session.nom ?? undefined}
          />

          {/* Header marketing tablet [md, lg) */}
          <div className="hidden md:block lg:hidden">
            <Header />
          </div>

          <main id="main" className="flex-1 min-h-screen container-page py-space-5">
            {children}
          </main>
        </div>
      </div>
    </>
  )
}
