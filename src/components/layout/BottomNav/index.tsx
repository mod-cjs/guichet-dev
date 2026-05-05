'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const ITEMS = [
  {
    href: '/',
    label: 'Accueil',
    match: (p: string) => p === '/',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        <polyline points="9 22 9 12 15 12 15 22"/>
      </svg>
    ),
  },
  {
    href: '/opportunites',
    label: 'Offres',
    match: (p: string) => p.startsWith('/opportunites'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
    ),
  },
  {
    href: '/evenements',
    label: 'Agenda',
    match: (p: string) => p.startsWith('/evenements'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
        <line x1="16" y1="2" x2="16" y2="6"/>
        <line x1="8" y1="2" x2="8" y2="6"/>
        <line x1="3" y1="10" x2="21" y2="10"/>
      </svg>
    ),
  },
  {
    href: '/ressources',
    label: 'Ressources',
    match: (p: string) => p.startsWith('/ressources'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
      </svg>
    ),
  },
  {
    href: '/jeune/mon-profil',
    label: 'Profil',
    match: (p: string) => p.startsWith('/jeune'),
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
        <circle cx="12" cy="7" r="4"/>
      </svg>
    ),
  },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="md:hidden fixed left-0 right-0 bottom-0 bg-white border-t border-gj-line"
      style={{
        zIndex: 'var(--gj-z-bottom-nav)',
        boxShadow: 'var(--gj-shadow-bottom-nav)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
      aria-label="Navigation principale"
    >
      <div className="grid grid-cols-5">
        {ITEMS.map(item => {
          const active = item.match(pathname)
          return (
            <Link
              key={item.href}
              href={item.href}
              className="relative flex flex-col items-center justify-center gap-[2px]
                no-underline transition-colors"
              style={{
                minHeight: 'var(--tap-min)',
                paddingTop: 6,
                paddingBottom: 6,
                color: active ? 'var(--gj-teal-deep)' : 'var(--color-text-secondary)',
              }}
              aria-current={active ? 'page' : undefined}
            >
              {active && (
                <span
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-8 rounded-b-[3px]"
                  style={{ height: 3, background: 'var(--gj-teal)' }}
                  aria-hidden
                />
              )}
              {item.icon}
              <span style={{ fontSize: 'var(--fs-100)', fontWeight: 600, lineHeight: 1 }}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
