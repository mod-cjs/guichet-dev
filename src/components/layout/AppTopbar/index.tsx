import Link from 'next/link'
import { UserMenu } from '@/components/layout/UserMenu'
import type { CJSSession } from '@/types/user'

interface Props {
  session: CJSSession
}

export function AppTopbar({ session }: Props) {
  const initials =
    (session.prenom?.[0] ?? '').toUpperCase() +
    (session.nom?.[0] ?? '').toUpperCase()

  return (
    <header
      className="md:hidden sticky top-0 bg-white border-b border-gj-line flex-shrink-0"
      style={{ zIndex: 'var(--gj-z-nav)', paddingTop: 'var(--safe-top)' }}
    >
      <div className="flex items-center gap-space-2 px-space-3 h-12">

        {/* Logo — pointe vers le dashboard (user toujours connecté à ce stade) */}
        <Link
          href="/jeune/tableau-de-bord"
          className="flex items-center gap-[6px] no-underline flex-shrink-0"
          aria-label="Tableau de bord"
        >
          <div className="w-8 h-8 bg-gj-teal rounded-[7px] flex items-center justify-center flex-shrink-0">
            <svg width="16" height="16" viewBox="0 0 13 13" fill="none" aria-hidden>
              <circle cx="6.5" cy="3.5" r="2.1" fill="#F9C400"/>
              <path d="M1.5 12c0-2.8 2.3-4.3 5-4.3s5 1.5 5 4.3" stroke="white" strokeWidth="1.4" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-fs-300 font-black text-gj-teal-deep leading-none">
            Guichet<b className="text-gj-yellow-ink">Jeunesse</b>
          </span>
        </Link>

        <div className="flex-1" />

        {/* Avatar / menu utilisateur (bouton notifications retiré tant que la page
            /jeune/notifications n'existe pas — sera ajouté en m11/m12) */}
        <UserMenu
          initials={initials}
          prenom={session.prenom ?? ''}
          nom={session.nom ?? ''}
        />
      </div>
    </header>
  )
}
