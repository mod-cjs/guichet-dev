'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href: string
  emoji: string
  label: string
  badge?: number
}

const ITEMS: NavItem[] = [
  { href: '/',               emoji: '🏠', label: 'Accueil' },
  { href: '/opportunites',   emoji: '🔍', label: 'Opp' },
  { href: '/agenda',         emoji: '📅', label: 'Agenda' },
  { href: '/ressources',     emoji: '📚', label: 'Resso' },
  { href: '/jeune/mon-profil', emoji: '👤', label: 'Profil' },
]

interface BottomNavProps {
  badges?: Partial<Record<string, number>>
}

export function BottomNav({ badges = {} }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="fixed inset-x-0 bottom-0 bg-white border-t border-gj-line shadow-gj-nav
        grid grid-cols-5"
      style={{
        paddingBottom: 'calc(6px + var(--safe-bottom))',
        zIndex: 'var(--gj-z-bottom-nav)',
      }}
      aria-label="Navigation principale"
    >
      {ITEMS.map(item => {
        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href))
        const badge = badges[item.href]
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-[2px] text-fs-100 font-bold
              pt-[6px] pb-[4px] relative cursor-pointer no-underline
              min-h-[var(--tap-min)] transition-colors
              ${isActive ? 'text-gj-teal-deep' : 'text-color-text-secondary'}`}
            aria-current={isActive ? 'page' : undefined}
          >
            {isActive && (
              <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-gj-teal rounded-b-[3px]" />
            )}
            {badge && badge > 0 && (
              <span className="absolute top-[2px] right-[14px] min-w-[16px] h-4 bg-gj-red text-white
                rounded-[8px] text-[10px] font-bold px-[4px] flex items-center justify-center
                border-2 border-white">
                {badge > 9 ? '9+' : badge}
              </span>
            )}
            <span className="text-[22px] leading-none">{item.emoji}</span>
            <span>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
