import Link from 'next/link'
import { getSession } from '@/lib/auth'

export async function Header() {
  const session = await getSession()

  return (
    <header
      className="sticky top-0 bg-white border-b-[1.5px] border-gj-line"
      style={{ zIndex: 'var(--gj-z-nav)' }}
    >
      <div
        className="flex items-center overflow-x-auto"
        style={{ padding: '0 var(--space-3)', gap: '0' }}
      >
        {/* Logo */}
        <Link
          href="/"
          className="flex items-center gap-[6px] no-underline flex-shrink-0 py-[10px] mr-[5px]"
          aria-label="Guichet Jeunesse — accueil"
        >
          <div className="w-6 h-6 bg-gj-teal rounded-[5px] flex items-center justify-center flex-shrink-0">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden>
              <circle cx="6.5" cy="3.5" r="2.1" fill="#F9C400"/>
              <path d="M1.5 12c0-2.8 2.3-4.3 5-4.3s5 1.5 5 4.3" stroke="white" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
          </div>
          <span className="text-[13px] font-black text-gj-teal-deep whitespace-nowrap">
            Guichet<b className="text-gj-yellow">Jeunesse</b>.sn
          </span>
        </Link>

        {/* Nav links */}
        <nav className="flex items-center">
          {[
            { href: '/',             label: 'Accueil' },
            { href: '/opportunites', label: 'Opportunités' },
            { href: '/evenements',   label: 'Agenda' },
            { href: '/ressources',   label: 'Ressources' },
            { href: '/centres',      label: 'Centres CJS' },
            ...(session ? [{ href: '/jeune/mon-profil', label: 'Mon profil' }] : []),
          ].map(link => (
            <Link
              key={link.href}
              href={link.href}
              className="px-[8px] text-[11px] text-gj-grey hover:text-gj-teal hover:bg-gj-teal-soft
                no-underline whitespace-nowrap flex-shrink-0 transition-colors
                border-b-[3px] border-transparent"
              style={{ paddingTop: 13, paddingBottom: 13 }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-[4px] pl-[5px] flex-shrink-0 py-[10px]">
          <a
            href="https://elearning.cjs.sn"
            target="_blank"
            rel="noopener noreferrer"
            className="px-[8px] py-[3px] border-[1.5px] border-gj-line rounded-[5px]
              text-[10px] text-gj-grey bg-gj-bg whitespace-nowrap no-underline
              hover:border-gj-teal transition-colors"
          >
            e-learning ↗
          </a>
          <a
            href="https://yeah.cjs.sn"
            target="_blank"
            rel="noopener noreferrer"
            className="px-[8px] py-[3px] border-[1.5px] border-gj-yellow rounded-[5px]
              text-[10px] text-gj-yellow-ink bg-gj-yellow-soft whitespace-nowrap
              font-bold no-underline hover:opacity-90 transition-opacity"
          >
            YEAH ↗
          </a>
          {session ? (
            <Link
              href="/jeune/mon-profil"
              className="w-7 h-7 rounded-full bg-gj-teal flex items-center justify-center
                text-white text-[11px] font-bold no-underline flex-shrink-0"
              title={`${session.prenom} ${session.nom}`}
            >
              {(session.prenom?.[0] ?? '').toUpperCase()}{(session.nom?.[0] ?? '').toUpperCase()}
            </Link>
          ) : (
            <Link
              href="/auth/connexion"
              className="bg-gj-teal text-white px-[11px] rounded-[6px] text-[11px]
                font-bold no-underline whitespace-nowrap
                min-h-[var(--tap-min)] flex items-center
                hover:bg-gj-teal-deep transition-colors"
            >
              S'inscrire
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
