import Link from 'next/link'
import { Icon } from '../Icon'

export interface PaginationProps {
  /** Page courante (1-based). */
  currentPage: number
  /** Nombre total de pages (>= 1). */
  totalPages: number
  /** URL de base (ex. "/opportunites" ou "/opportunites?type=Emploi"). */
  baseUrl: string
  /** Nom du paramètre de page dans l'URL (défaut: "page"). */
  pageParam?: string
  /** Libellé accessible du composant. */
  ariaLabel?: string
  className?: string
}

/**
 * Construit l'URL d'une page donnée en préservant les éventuels
 * paramètres déjà présents dans `baseUrl`.
 */
function buildHref(baseUrl: string, pageParam: string, page: number): string {
  const [path, qs = ''] = baseUrl.split('?')
  const params = new URLSearchParams(qs)
  if (page <= 1) params.delete(pageParam)
  else params.set(pageParam, String(page))
  const s = params.toString()
  return s ? `${path}?${s}` : path
}

/**
 * Calcule la séquence de pages à afficher :
 *  - si totalPages <= 7 : toutes les pages 1..N
 *  - sinon : 1, …, current-1, current, current+1, …, totalPages
 *    avec ajustements aux bords (1, 2, 3, …, N et 1, …, N-2, N-1, N).
 */
export function paginationRange(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }
  const pages: (number | 'ellipsis')[] = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  if (start > 2) pages.push('ellipsis')
  for (let p = start; p <= end; p++) pages.push(p)
  if (end < totalPages - 1) pages.push('ellipsis')
  pages.push(totalPages)
  return pages
}

function pillClass(active: boolean): string {
  return [
    'inline-flex items-center justify-center min-w-[36px] h-[36px] px-space-2',
    'rounded-gj-sm text-fs-300 font-black border-[1.5px] transition-colors',
    'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
    active
      ? 'bg-gj-teal-deep border-gj-teal-deep text-white'
      : 'bg-gj-surface border-gj-line text-color-text-primary hover:border-gj-line-strong',
  ].join(' ')
}

/**
 * <Pagination /> — pagination numérotée générique pour les listes desktop.
 * Conforme au design v2 (lot3-opps-web · WebOppPagination L.250-276).
 *
 * Render : `‹ 1 · 2 · 3 … 12 ›` avec ellipsis si totalPages > 7.
 * Liens `<Link prefetch={false}>` (les pages list sont déjà cachables).
 * `aria-current="page"` sur la page active.
 */
export function Pagination({
  currentPage,
  totalPages,
  baseUrl,
  pageParam = 'page',
  ariaLabel = 'Pagination',
  className = '',
}: PaginationProps) {
  if (totalPages <= 1) return null

  const items = paginationRange(currentPage, totalPages)
  const prevPage = Math.max(1, currentPage - 1)
  const nextPage = Math.min(totalPages, currentPage + 1)
  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  return (
    <nav
      aria-label={ariaLabel}
      className={`flex items-center gap-space-1 ${className}`}
    >
      {hasPrev ? (
        <Link
          href={buildHref(baseUrl, pageParam, prevPage)}
          prefetch={false}
          rel="prev"
          aria-label="Page précédente"
          className={pillClass(false)}
        >
          <Icon name="chevron-left" size={16} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${pillClass(false)} opacity-50 pointer-events-none`}
        >
          <Icon name="chevron-left" size={16} />
        </span>
      )}

      {items.map((it, idx) =>
        it === 'ellipsis' ? (
          <span
            key={`e-${idx}`}
            aria-hidden="true"
            className="px-space-1 text-color-text-secondary font-bold select-none"
          >
            …
          </span>
        ) : (
          <Link
            key={it}
            href={buildHref(baseUrl, pageParam, it)}
            prefetch={false}
            aria-label={`Page ${it}`}
            aria-current={it === currentPage ? 'page' : undefined}
            className={pillClass(it === currentPage)}
          >
            {it}
          </Link>
        ),
      )}

      {hasNext ? (
        <Link
          href={buildHref(baseUrl, pageParam, nextPage)}
          prefetch={false}
          rel="next"
          aria-label="Page suivante"
          className={pillClass(false)}
        >
          <Icon name="chevron-right" size={16} />
        </Link>
      ) : (
        <span
          aria-disabled="true"
          className={`${pillClass(false)} opacity-50 pointer-events-none`}
        >
          <Icon name="chevron-right" size={16} />
        </span>
      )}
    </nav>
  )
}
