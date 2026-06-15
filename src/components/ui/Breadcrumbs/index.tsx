import Link from 'next/link'
import { Fragment } from 'react'
import { Icon } from '../Icon'

export interface BreadcrumbItem {
  /** Libellé affiché de l'item. */
  label: string
  /** URL interne. Le dernier item (page courante) doit être passé sans href. */
  href?: string
}

export interface BreadcrumbsProps {
  /** Items du fil — dernier élément = page courante (sans href). */
  items: BreadcrumbItem[]
  /** Classes additionnelles appliquées au <nav>. */
  className?: string
}

/**
 * <Breadcrumbs /> — Fil d'Ariane sémantique (GUIC-403).
 *
 * Visible desktop uniquement (`hidden lg:flex`) — sur mobile, le retour est
 * assuré par l'AppTopbar ou le bouton "← Toutes les ..." présent sur les
 * pages détail.
 *
 * a11y : landmark <nav aria-label="Fil d'Ariane"> + <ol> ordonnée, dernier
 * item rendu en <span aria-current="page">.
 */
export function Breadcrumbs({ items, className = '' }: BreadcrumbsProps) {
  if (items.length === 0) return null

  return (
    <nav
      aria-label="Fil d’Ariane"
      className={`hidden lg:flex items-center text-fs-200 ${className}`}
    >
      <ol className="flex items-center gap-space-2 m-0 p-0 list-none">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1
          return (
            <Fragment key={`${item.label}-${idx}`}>
              <li className="flex items-center">
                {isLast || !item.href ? (
                  <span
                    aria-current="page"
                    className="font-bold"
                    style={{ color: 'var(--gj-ink)' }}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href}
                    className="hover:underline"
                    style={{ color: 'var(--gj-grey)' }}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
              {!isLast && (
                <li
                  aria-hidden="true"
                  data-breadcrumb-separator
                  className="flex items-center"
                  style={{ color: 'var(--gj-grey)' }}
                >
                  <Icon name="chevron-right" size={14} />
                </li>
              )}
            </Fragment>
          )
        })}
      </ol>
    </nav>
  )
}
