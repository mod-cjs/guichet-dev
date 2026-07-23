import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { Header } from '@/components/layout/Header'
import { BenefSidebar } from '@/components/layout/BenefSidebar'
import { BenefTopBar } from '@/components/layout/BenefTopBar'
import { SkipLink } from '@/components/ui/SkipLink'
import { YayeBubble } from '@/components/yaye/YayeBubble'
import { YayeProvider } from '@/components/yaye/YayeProvider'
import { countUnreadNotifications } from '@/lib/loaders/notifications'
import { getHasProfilePhoto } from '@/lib/loaders/profil-photo'
import { A11yProvider, type A11yPrefs } from '@/components/a11y/A11yProvider'
import { A11yGadgets } from '@/components/a11y/A11yGadgets'
import { prisma } from '@/lib/prisma'

/**
 * GUIC-581 — Anti-FOUC accessibilité : applique les préférences du cache
 * localStorage sur <html> avant l'hydratation (script parser-blocking).
 * Le provider React re-résout ensuite (valeur serveur prioritaire).
 */
const A11Y_INIT_SCRIPT = `(function(){try{var p=JSON.parse(localStorage.getItem('gj-a11y')||'null');if(!p)return;var h=document.documentElement;if(['s','l','xl'].indexOf(p.text)>-1)h.setAttribute('data-text',p.text);var m={contrast:['data-contrast','high'],gray:['data-gray','on'],motion:['data-motion','reduce'],spacing:['data-spacing','on'],falc:['data-falc','on'],kbd:['data-kbd','on'],cursor:['data-cursor','on'],guide:['data-guide','on'],voice:['data-voice','on']};for(var k in m){if(p[k]===true)h.setAttribute(m[k][0],m[k][1])}}catch(e){}})()`

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
 * v2 (cf `design-guichet-v2/web-dashboard.jsx`). Sous-PR A GUIC-205.
 *
 * Pas de footer marketing dans l'espace jeune (GUIC-216) — l'app a sa propre
 * identité, le footer corporate n'a pas sa place ici.
 *
 * On utilise un seul `<main>` autour de `{children}` (pas de duplication
 * de l'arbre React) et on conditionne uniquement le chrome (sidebar/topbar
 * vs header marketing) via CSS responsive.
 */
export default async function JeuneLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const userInitials =
    (session.prenom?.[0] ?? '').toUpperCase() +
    (session.nom?.[0] ?? '').toUpperCase()
  const userName = `${session.prenom ?? ''} ${session.nom ?? ''}`.trim()
  const userMeta = session.region ?? undefined
  // GUIC-247 — badge cloche desktop : non-lues côté serveur (best-effort).
  const unread = await countUnreadNotifications(session.cjsUid).catch(() => 0)
  // GUIC-447 — présence photo pour éviter le 404 proxy (best-effort).
  const hasPhoto = await getHasProfilePhoto(session.cjsUid).catch(() => false)
  // GUIC-581 — préférences d'accessibilité du profil (best-effort, la valeur
  // serveur est prioritaire sur le cache localStorage côté provider).
  const prefsA11y = await prisma.profilJeune
    .findUnique({
      where: { cjsUid: session.cjsUid },
      select: { prefsAccessibilite: true },
    })
    .then((p) => (p?.prefsAccessibilite ?? null) as A11yPrefs | null)
    .catch(() => null)

  return (
    <A11yProvider initial={prefsA11y}>
    <YayeProvider>
    <div className="lg:grid lg:min-h-[100svh]" style={{ gridTemplateColumns: '260px 1fr' }}>
      {/* GUIC-581 — anti-FOUC : cache localStorage appliqué avant hydratation */}
      <script dangerouslySetInnerHTML={{ __html: A11Y_INIT_SCRIPT }} />
      <SkipLink />
      {/* Sidebar desktop (≥lg) — composant déjà `hidden lg:flex` en interne.
          Wrapper sticky pour la garder visible au scroll. */}
      <div className="hidden lg:block sticky top-0 h-screen">
        <BenefSidebar
          userName={userName || undefined}
          userMeta={userMeta}
          userInitials={userInitials || undefined}
          cjsUid={session.cjsUid}
          hasPhoto={hasPhoto}
          unread={unread}
        />
      </div>

      {/* Colonne droite (desktop) / flow normal (mobile/tablet) */}
      <div className="flex flex-col min-w-0">
        {/* Top bar desktop (≥lg) — composant déjà `hidden lg:flex` en interne */}
        <BenefTopBar />

        {/* Header marketing : visible uniquement en tablet [md, lg)
            (mobile <md → shell mobile global ; desktop ≥lg → BenefTopBar ci-dessus) */}
        <div className="hidden md:block lg:hidden">
          <Header />
        </div>

        <main
          id="main"
          className="flex-1 min-h-[100svh] container-page py-space-5 pb-[calc(72px+env(safe-area-inset-bottom,0px))] lg:pb-space-6"
        >
          {children}
        </main>
      </div>
      {/* GUIC-373 — Yaye bubble universel pour l'app jeune.
          GUIC-376 — l'état d'ouverture est partagé avec le CTA sidebar
          via `YayeProvider`. */}
      <YayeBubble prenom={session.prenom ?? undefined} />
    </div>
    {/* GUIC-658 — guide de lecture + lecture vocale (rien rendu si off) */}
    <A11yGadgets />
    </YayeProvider>
    </A11yProvider>
  )
}
