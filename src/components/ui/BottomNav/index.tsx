'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/Icon'

interface NavItem {
  href: string
  icon: IconName
  label: string
}

/**
 * 5 onglets de la nav bénéficiaire mobile (refonte v2).
 * Icônes issues du sprite SVG `public/icons.svg` — règle CLAUDE.md :
 * aucun emoji comme icône de nav.
 *
 * Note : item Profil retiré (accessible via AppTopbar mobile, icône user
 * en haut). Remplacé par Centres pour exposer la cartographie YEAH —
 * cf GUIC-205 sous-PR A.
 */
const ITEMS: NavItem[] = [
  { href: '/',             icon: 'home',     label: 'Accueil' },
  { href: '/opportunites', icon: 'search',   label: 'Explorer' },
  { href: '/agenda',       icon: 'calendar', label: 'Agenda' },
  { href: '/ressources',   icon: 'document', label: 'Ressources' },
  { href: '/centres',      icon: 'pin',      label: 'Centres' },
]

interface BottomNavProps {
  badges?: Partial<Record<string, number>>
}

export function BottomNav({ badges = {} }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="gj-bottom-nav md:hidden fixed inset-x-0 bottom-0 bg-white border-t border-gj-line shadow-gj-nav
        grid grid-cols-5"
      style={{
        paddingBottom: 'calc(6px + var(--safe-bottom))',
        zIndex: 'var(--gj-z-bottom-nav)',
      }}
      aria-label="Navigation principale"
    >
      {ITEMS.map(item => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href) === true)
        const badge = badges[item.href]
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-[2px] text-fs-100 font-bold
              pt-[6px] pb-[4px] relative cursor-pointer no-underline
              min-h-[var(--tap-min)] transition-colors
              ${isActive ? 'text-gj-teal-deep' : 'text-color-text-secondary'}`}
            style={{
              color: isActive ? 'var(--gj-teal-deep)' : 'var(--color-text-secondary)',
            }}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 rounded-b-[3px]"
                style={{ height: 3, background: 'var(--gj-teal-deep)' }}
                aria-hidden
              />
            )}
            {badge && badge > 0 ? (
              <span className="absolute top-[2px] right-[14px] min-w-[16px] h-4 bg-gj-red text-white
                rounded-[8px] text-[10px] font-bold px-[4px] flex items-center justify-center
                border-2 border-white">
                {badge > 9 ? '9+' : badge}
              </span>
            ) : null}
            <Icon name={item.icon} size={22} />
            <span
              className="px-[2px] max-w-full"
              style={{
                fontSize: 'var(--fs-100)',
                fontWeight: isActive ? 800 : 600,
                lineHeight: 1.1,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                letterSpacing: '-0.01em',
              }}
            >
              {item.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
