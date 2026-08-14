import { getSession } from '@/lib/auth'
import { masquesUtilisateur } from '@/lib/flags/ui-server'
import { Header } from '@/components/layout/Header'
import { Footer } from '@/components/layout/Footer'
import { BenefSidebar } from '@/components/layout/BenefSidebar'
import { BenefTopBar } from '@/components/layout/BenefTopBar'
import { SkipLink } from '@/components/ui/SkipLink'
import { YayeBubble } from '@/components/yaye/YayeBubble'
import { YayeProvider } from '@/components/yaye/YayeProvider'
import { countUnreadNotifications } from '@/lib/loaders/notifications'

/**
 * Layout des pages publiques (`/`, `/opportunites`, `/agenda`, `/ressources`,
 * `/centres`, `/legal/*`, `/auth/*`).
 *
 * Comportement adaptatif (décision PO 2026-06-08, option A — GUIC-349) :
 *
 * - **User anonyme** : Header + Footer marketing classiques, toutes tailles.
 *
 * - **User connecté** : expérience "espace jeune" même sur les pages publiques.
 *   - Desktop (≥lg) : layout 2 colonnes `BenefSidebar (260px) + BenefTopBar`.
 *   - Mobile/tablet (<lg) : `MobileTopShell` (AppTopbar) + `BottomNav` rendus
 *     globalement par `src/app/layout.tsx` → on n'ajoute rien ici, on cache
 *     juste la sidebar et la topbar desktop (`hidden lg:flex/grid`).
 *   - Pas de Header / Footer marketing en mode connecté (l'app a son chrome).
 *
 * Cette règle modifie la décision archivée dans
 * `.agent_context/specs/layout-navigation.md` qui réservait BenefSidebar/TopBar
 * à `/jeune/*`. L'évolution : ces shells s'étendent désormais aux pages
 * publiques pour offrir une expérience continue à l'utilisateur connecté.
 */
export default async function PublicLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const masques = await masquesUtilisateur(session?.roles)

  if (!session) {
    return (
      <YayeProvider>
        <SkipLink />
        <Header />
        {/* `100svh` (plus petit viewport, STABLE) et non `100vh`/`min-h-screen` :
            sur mobile, `100vh` inclut la zone derrière la barre d'URL → le shell
            « s'étire » quand la barre se masque au scroll. `svh` ne bouge pas. */}
        <main id="main" className="min-h-[100svh]">{children}</main>
        <Footer masques={masques} />
        {/* GUIC-373 — Yaye bubble universel sur les pages publiques.
            GUIC-376 — état partagé via YayeProvider. */}
        <YayeBubble />
      </YayeProvider>
    )
  }

  const userInitials =
    (session.prenom?.[0] ?? '').toUpperCase() +
    (session.nom?.[0] ?? '').toUpperCase()
  const userName = `${session.prenom ?? ''} ${session.nom ?? ''}`.trim()
  const userMeta = session.region ?? undefined
  // Badge cloche desktop : non-lues côté serveur (best-effort, comme /jeune/*).
  const unread = await countUnreadNotifications(session.cjsUid).catch(() => 0)

  return (
    <YayeProvider>
    <div className="lg:grid lg:min-h-[100svh]" style={{ gridTemplateColumns: '260px 1fr' }}>
      <SkipLink />
      {/* Sidebar desktop (≥lg) — composant `hidden lg:flex` en interne.
          Wrapper sticky pour la garder visible au scroll. */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <BenefSidebar
          userName={userName || undefined}
          userMeta={userMeta}
          userInitials={userInitials || undefined}
          cjsUid={session.cjsUid}
          unread={unread}
        />
      </div>

      {/* Colonne droite (desktop) / flow normal (mobile/tablet) */}
      <div className="flex flex-col min-w-0">
        {/* Top bar desktop (≥lg) — composant `hidden lg:flex` en interne.
            Mobile (<lg) : MobileTopShell global prend le relais (cf. app/layout.tsx). */}
        <BenefTopBar />

        <main
          id="main"
          className="flex-1 min-h-[100svh] pb-[calc(72px+env(safe-area-inset-bottom,0px))] lg:pb-0"
        >
          {children}
        </main>
      </div>
      {/* GUIC-373 — Yaye bubble universel (user connecté sur pages publiques).
          GUIC-376 — état partagé avec le CTA sidebar via YayeProvider. */}
      <YayeBubble />
    </div>
    </YayeProvider>
  )
}
