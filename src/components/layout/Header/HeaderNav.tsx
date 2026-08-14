'use client'

import Link from 'next/link'
import { lienMasque } from '@/lib/flags/ui'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'

const PUBLIC_LINKS = [
  { href: '/',             label: 'Accueil',      match: (p: string) => p === '/' },
  { href: '/opportunites', label: 'Opportunités', match: (p: string) => p.startsWith('/opportunites') },
  { href: '/agenda',       label: 'Agenda',       match: (p: string) => p.startsWith('/agenda') },
  { href: '/ressources',   label: 'Ressources',   match: (p: string) => p.startsWith('/ressources') },
  { href: '/centres',      label: 'Centres CJS',  match: (p: string) => p.startsWith('/centres') },
]

const EXTERNAL_LINKS = [
  { href: 'https://yeah.consortiumjeunessesenegal.org', label: 'YEAH' },
  { href: 'https://elearning.guichetjeunesse.sn',       label: 'E-learning' },
]

const AUTH_LINKS = [
  { href: '/jeune/tableau-de-bord', label: 'Mon dashboard', match: (p: string) => p.startsWith('/jeune/tableau-de-bord') },
  { href: '/jeune/mon-profil',      label: 'Mon profil',    match: (p: string) => p.startsWith('/jeune/mon-profil') },
]

interface Props {
  isAuthenticated: boolean
  /** GUIC-706 — clés masquées pour ce visiteur, calculées côté serveur par le Header. */
  masques?: readonly string[]
}

export function HeaderNav({ isAuthenticated, masques = [] }: Props) {
  // usePathname() peut retourner null (Storybook hors contexte Next router,
  // ou edge case rendu) — on retombe sur '/' qui ne matchera que la home.
  const pathname = usePathname() ?? '/'

  return (
    <nav className="hidden md:flex items-center">
      {PUBLIC_LINKS.filter(l => !lienMasque(l.href, masques)).map(link => {
        const active = link.match(pathname)
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? 'page' : undefined}
            className={`px-[8px] text-[11px] no-underline whitespace-nowrap flex-shrink-0 transition-colors
              border-b-[3px] ${active
                ? 'text-gj-teal-deep border-gj-teal bg-gj-teal-soft/40'
                : 'text-gj-grey hover:text-gj-teal hover:bg-gj-teal-soft border-transparent'
              }`}
            style={{ paddingTop: 13, paddingBottom: 13 }}
          >
            {link.label}
          </Link>
        )
      })}

      {EXTERNAL_LINKS.map(link => (
        <a
          key={link.href}
          href={link.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${link.label} (ouvre dans un nouvel onglet)`}
          className="px-[8px] text-[11px] no-underline whitespace-nowrap flex-shrink-0 transition-colors
            border-b-[3px] text-gj-grey hover:text-gj-teal hover:bg-gj-teal-soft border-transparent
            inline-flex items-center gap-1"
          style={{ paddingTop: 13, paddingBottom: 13 }}
        >
          {link.label}
          <Icon name="external" size={10} />
        </a>
      ))}

      {isAuthenticated && (
        <>
          <span className="mx-[6px] h-5 w-px bg-gj-line" aria-hidden />
          {AUTH_LINKS.filter(l => !lienMasque(l.href, masques)).map(link => {
            const active = link.match(pathname)
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={`px-[8px] text-[11px] font-bold no-underline whitespace-nowrap flex-shrink-0
                  transition-colors border-b-[3px] ${active
                    ? 'text-gj-teal-deep border-gj-teal bg-gj-teal-soft/40'
                    : 'text-gj-teal-deep hover:bg-gj-teal-soft border-transparent'
                  }`}
                style={{ paddingTop: 13, paddingBottom: 13 }}
              >
                {link.label}
              </Link>
            )
          })}
        </>
      )}
    </nav>
  )
}
