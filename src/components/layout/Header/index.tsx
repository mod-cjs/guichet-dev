import Image from 'next/image'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import { UserMenu } from '@/components/layout/UserMenu'
import { HeaderNav } from './HeaderNav'

export async function Header() {
  const session = await getSession()

  return (
    <header
      className="sticky top-0 bg-white border-b-[1.5px] border-gj-line"
      style={{ zIndex: 'var(--gj-z-nav)' }}
    >
      <div className="container-page flex items-center">

        {/* Logo — toujours visible (image unifiée cf. AppTopbar/BenefSidebar) */}
        <Link
          href="/"
          className="flex items-center no-underline flex-shrink-0 py-[10px] mr-[5px]"
          aria-label="Guichet Jeunesse — accueil"
        >
          <Image
            src="/logo-guichet.png"
            alt="Guichet Jeunesse"
            width={120}
            height={30}
            priority
            style={{ height: 30, width: 'auto' }}
          />
        </Link>

        {/* Nav desktop — composant client pour route active state via usePathname */}
        <HeaderNav isAuthenticated={!!session} />

        {/* Côté droit */}
        <div className="ml-auto flex items-center gap-[4px] pl-[5px] flex-shrink-0 py-[10px]">

          {/* GUIC-372 — retiré liens externes YEAH + e-learning (incorrects). */}

          {/* CTA — toujours visible */}
          {session ? (
            <UserMenu
              initials={
                (session.prenom?.[0] ?? '').toUpperCase() +
                (session.nom?.[0] ?? '').toUpperCase()
              }
              prenom={session.prenom ?? ''}
              nom={session.nom ?? ''}
            />
          ) : (
            <>
              {/* v5 (GUIC-689, web-onboarding.jsx:200-201) : « Se connecter » en
                  lien texte, « Créer mon compte » en bouton contour (desktop).
                  Mobile : seul « Se connecter » reste visible (layout-navigation §8). */}
              <Link
                href="/auth/connexion"
                className="text-gj-grey px-space-2 text-[13px] font-bold no-underline
                  whitespace-nowrap flex-shrink-0 min-h-[var(--tap-min)] flex items-center
                  hover:text-gj-ink transition-colors"
              >
                Se connecter
              </Link>
              <Link
                href="/auth/connexion"
                className="hidden md:flex bg-gj-surface text-gj-teal-deep border-[1.5px]
                  border-gj-line-strong px-space-3 rounded-gj-md text-[13px] font-black
                  no-underline whitespace-nowrap flex-shrink-0 min-h-[var(--tap-min)]
                  items-center hover:border-gj-teal-deep transition-colors"
              >
                Créer mon compte →
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
