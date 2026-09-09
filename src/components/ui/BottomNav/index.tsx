'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import type { BottomNavItem } from './nav'


interface BottomNavProps {
  badges?: Partial<Record<string, number>>
  /**
   * GUIC-706 — items À AFFICHER, déjà filtrés par le serveur.
   *
   * Le composant ne reçoit AUCUNE clé de flag : les props d'un composant client sont
   * sérialisées dans le HTML, et une liste de clés y annoncerait les fonctionnalités
   * cachées — y compris à un visiteur anonyme.
   *
   * Trois des cinq items sont rattachés à une fonctionnalité masquable. La grille était
   * figée à cinq colonnes : retirer un item la déformait. Elle suit désormais le nombre
   * d'items réellement affichés.
   */
  items: readonly BottomNavItem[]
}

export function BottomNav({ badges = {}, items }: BottomNavProps) {
  const pathname = usePathname()

  return (
    <nav
      className="gj-bottom-nav md:hidden fixed inset-x-0 bottom-0 bg-white border-t border-gj-line shadow-gj-nav grid"
      style={{
        // GUIC-706 — colonnes suivant le nombre d'items affichés. La grille était figée à
        // cinq : masquer une fonctionnalité laissait un trou dans la barre de navigation
        // mobile des 22 000 utilisateurs.
        gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))`,
        paddingBottom: 'calc(6px + var(--safe-bottom))',
        zIndex: 'var(--gj-z-bottom-nav)',
      }}
      aria-label="Navigation principale"
    >
      {items.map(item => {
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
                rounded-[8px] text-fs-100 font-bold px-[4px] flex items-center justify-center
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
