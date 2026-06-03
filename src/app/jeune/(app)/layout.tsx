import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
<<<<<<< HEAD
import { Footer } from '@/components/layout/Footer'
import { SkipLink } from '@/components/ui/SkipLink'
import { BenefSidebar } from '@/components/layout/BenefSidebar'
import { BenefTopBar } from '@/components/layout/BenefTopBar'
=======
>>>>>>> origin/feature/GUIC-216-fixes-audit-ui

/**
 * Layout des pages app jeune.
 *
 * Mobile (<md) : AppTopbar + BottomNav rendus globalement par MobileAppShell
 * (cf src/app/layout.tsx) — pas de duplication ici.
 *
<<<<<<< HEAD
 * Tablet [md, lg) : Header marketing + Footer (transition).
 *
 * Desktop (≥lg) : layout 2 colonnes — BenefSidebar gauche (260px, sticky)
 * + BenefTopBar haut (sticky) + contenu. C'est le shell web bénéficiaire
 * v2 (cf `design-guichet-v2/web-dashboard.jsx`). Sous-PR A GUIC-205.
 *
 * On utilise un seul `<main>` autour de `{children}` (pas de duplication
 * de l'arbre React) et on conditionne uniquement le chrome (sidebar/topbar
 * vs header marketing) via CSS responsive.
=======
 * Desktop : Header marketing classique. Pas de footer marketing dans l'espace
 * jeune (GUIC-216) — l'app a sa propre identité, le footer corporate n'a pas
 * sa place ici.
>>>>>>> origin/feature/GUIC-216-fixes-audit-ui
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
<<<<<<< HEAD
      <SkipLink />
      <div className="lg:grid lg:min-h-screen" style={{ gridTemplateColumns: '260px 1fr' }}>
        {/* Sidebar desktop (≥lg) — composant déjà `hidden lg:flex` en interne.
            Wrapper sticky pour la garder visible au scroll. */}
        <div className="hidden lg:block sticky top-0 h-screen">
          <BenefSidebar
            userName={userName || undefined}
            userMeta={userMeta}
            userInitials={userInitials || undefined}
          />
        </div>

      {/* Colonne droite (desktop) / flow normal (mobile/tablet) */}
      <div className="flex flex-col min-w-0">
        {/* Top bar desktop (≥lg) — composant déjà `hidden lg:flex` en interne */}
        <BenefTopBar userInitials={userInitials || undefined} />

        {/* Header marketing : visible uniquement en tablet [md, lg)
            (mobile <md → shell mobile global ; desktop ≥lg → BenefTopBar ci-dessus) */}
        <div className="hidden md:block lg:hidden">
          <Header />
        </div>

        <main id="main" className="flex-1 min-h-screen container-page py-space-5">
          {children}
        </main>

        {/* Footer : caché en mobile (shell global), visible tablet + desktop */}
        <div className="hidden md:block">
          <Footer />
        </div>
        </div>
      </div>
=======
      {/* Desktop : header marketing (mobile shell géré globalement) */}
      <div className="hidden md:block">
        <Header />
      </div>

      <main id="main" className="min-h-screen container-page py-space-5">
        {children}
      </main>
>>>>>>> origin/feature/GUIC-216-fixes-audit-ui
    </>
  )
}
