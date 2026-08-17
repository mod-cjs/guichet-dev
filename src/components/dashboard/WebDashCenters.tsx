import Link from 'next/link'
import { lienMasque } from '@/lib/flags/ui'
import { Icon } from '@/components/ui/Icon'

export interface DashCenterItem {
  id:       string
  name:     string
  address:  string
  distance: string
  href?:    string
}

interface Props {
  /** GUIC-706 — clés masquées pour ce visiteur (calcul serveur). */
  masques?: readonly string[]
  items: DashCenterItem[]
}

/**
 * WebDashCenters — encart aside listant les centres CJS les plus proches.
 *
 * Référence : design-guichet-v2/web-dashboard.jsx#WebDashCenters (L.555-583)
 */
export function WebDashCenters({ masques = [],  items }: Props) {
  return (
    <div className="bg-gj-surface border border-gj-line rounded-gj-md p-space-4
      flex flex-col gap-space-3">
      <div className="flex justify-between items-baseline">
        <h3 className="text-fs-300 font-black">Centres CJS près de toi</h3>
        {!lienMasque('/centres', masques) && (
          <Link
          href="/centres"
          className="text-fs-200 text-gj-teal-deep font-black hover:underline"
        >
          Carte →
        </Link>
        )}
      </div>
      {items.length === 0 ? (
        <p className="text-fs-200 text-color-text-secondary py-space-3 text-center">
          Aucun centre à proximité.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((c, i) => {
            const content = (
              <div className="flex items-center gap-space-3 py-space-3">
                <span
                  aria-hidden
                  className="w-8 h-8 rounded-gj-sm bg-gj-yellow-soft text-gj-yellow-ink
                    inline-flex items-center justify-center flex-shrink-0"
                >
                  <Icon name="pin" size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-fs-200 font-black truncate">{c.name}</div>
                  <div className="text-fs-100 text-color-text-secondary mt-space-1 truncate">
                    {c.address}
                  </div>
                </div>
                <span className="text-fs-200 font-black text-gj-teal-deep whitespace-nowrap">
                  {c.distance}
                </span>
              </div>
            )
            return (
              <li
                key={c.id}
                className={i < items.length - 1 ? 'border-b border-gj-line' : ''}
              >
                {c.href ? (
                  <Link href={c.href} className="block hover:bg-gj-teal-soft/40 -mx-space-2 px-space-2 rounded-gj-sm">
                    {content}
                  </Link>
                ) : (
                  content
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
