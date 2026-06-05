import Link from 'next/link'

export interface DashEventItem {
  id:       string
  day:      number
  month:    string
  title:    string
  subtitle: string
  href?:    string
}

interface Props {
  items: DashEventItem[]
}

/**
 * WebDashEvents — encart aside listant 3 événements à venir avec date-box teal.
 *
 * Référence : design-guichet-v2/web-dashboard.jsx#WebDashEvents (L.523-553)
 */
export function WebDashEvents({ items }: Props) {
  return (
    <div className="bg-gj-surface border border-gj-line rounded-gj-md p-space-4
      flex flex-col gap-space-3">
      <div className="flex justify-between items-baseline">
        <h3 className="text-fs-300 font-black">Événements à venir</h3>
        <Link
          href="/jeune/agenda"
          className="text-fs-200 text-gj-teal-deep font-black hover:underline"
        >
          Voir tous →
        </Link>
      </div>
      {items.length === 0 ? (
        <p className="text-fs-200 text-color-text-secondary py-space-3 text-center">
          Aucun événement à venir.
        </p>
      ) : (
        <ul className="flex flex-col">
          {items.map((e, i) => {
            const content = (
              <div className="flex gap-space-3 items-center py-space-3">
                <div
                  aria-hidden
                  className="flex-shrink-0 w-12 text-center bg-gj-teal-soft
                    text-gj-teal-deep rounded-gj-sm py-space-2"
                >
                  <div className="text-fs-400 font-black leading-none">{e.day}</div>
                  <div className="text-fs-100 font-black uppercase tracking-wider mt-space-1">
                    {e.month}
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-fs-200 font-black leading-tight">{e.title}</div>
                  <div className="text-fs-100 text-color-text-secondary mt-space-1">
                    {e.subtitle}
                  </div>
                </div>
              </div>
            )
            return (
              <li
                key={e.id}
                className={i < items.length - 1 ? 'border-b border-gj-line' : ''}
              >
                {e.href ? (
                  <Link href={e.href} className="block hover:bg-gj-teal-soft/40 -mx-space-2 px-space-2 rounded-gj-sm">
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
