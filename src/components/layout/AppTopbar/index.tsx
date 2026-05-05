import Link from 'next/link'
import type { CJSSession } from '@/lib/auth'

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

        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-[6px] no-underline flex-shrink-0"
          aria-label="Guichet Jeunesse — accueil"
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

        {/* Notifications */}
        <button
          className="relative flex items-center justify-center bg-gj-bg rounded-full flex-shrink-0"
          style={{ width: 'var(--tap-min)', height: 'var(--tap-min)' }}
          aria-label="Notifications"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-gj-grey" aria-hidden>
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
          </svg>
          <span
            className="absolute top-[9px] right-[9px] w-2 h-2 bg-gj-red rounded-full border-2 border-white"
            aria-hidden
          />
        </button>

        {/* Avatar / profil */}
        <Link
          href="/jeune/mon-profil"
          className="flex items-center justify-center bg-gj-teal rounded-full text-white
            text-[11px] font-bold no-underline flex-shrink-0
            hover:bg-gj-teal-deep transition-colors"
          style={{ width: 'var(--tap-min)', height: 'var(--tap-min)' }}
          aria-label={`Mon profil — ${session.prenom} ${session.nom}`}
        >
          {initials || '?'}
        </Link>
      </div>
    </header>
  )
}
