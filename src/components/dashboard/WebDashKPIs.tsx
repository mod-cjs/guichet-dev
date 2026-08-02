import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import type { IconName } from '@/components/ui/Icon'

export interface KPIItem {
  value:        string | number
  label:        string
  hint?:        string
  hintTone?:    'positive' | 'warning' | 'neutral'
  icon:         IconName
  tone:         'teal' | 'yellow' | 'blue' | 'red'
  /** Destination si la carte doit être cliquable (uniquement si valeur > 0). */
  href?:        string
}

interface Props {
  items: KPIItem[]
}

const toneStyles: Record<KPIItem['tone'], string> = {
  teal:   'bg-gj-teal-soft text-gj-teal-deep',
  yellow: 'bg-gj-yellow-soft text-gj-yellow-ink',
  blue:   'bg-gj-blue-soft text-gj-blue-ink',
  red:    'bg-gj-red-soft text-gj-red-ink',
}

// GUIC-689 — `warning` sert aux incitations (« Complète ton profil »,
// « Ajoute ton CV ») : ambre, pas rouge. Le rouge reste réservé à l'urgence
// d'échéance (règle v5 non négociable).
const hintStyles: Record<NonNullable<KPIItem['hintTone']>, string> = {
  positive: 'text-gj-green-ink',
  warning:  'text-gj-yellow-ink',
  neutral:  'text-color-text-secondary',
}

/**
 * WebDashKPIs — strip de 4 mini-cards stats (mobile 2-col / desktop 4-col).
 *
 * Référence : design-guichet-v2/web-dashboard.jsx#WebDashKPIs (L.344-389)
 */
export function WebDashKPIs({ items }: Props) {
  return (
    <section
      aria-label="Indicateurs clés"
      className="grid grid-cols-2 lg:grid-cols-4 gap-space-3 xl:gap-space-4"
    >
      {items.map((kpi) => {
        const numericValue =
          typeof kpi.value === 'number'
            ? kpi.value
            : parseInt(String(kpi.value), 10)
        const hasData = Number.isFinite(numericValue) && numericValue > 0
        const clickable = !!kpi.href && hasData
        const baseCard =
          'bg-gj-surface border border-gj-line rounded-gj-md p-space-4 flex items-start gap-space-3'
        const cardClass = clickable
          ? `${baseCard} hover:border-gj-teal hover:shadow-gj-sm transition-colors cursor-pointer
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gj-teal`
          : baseCard
        const inner = (
          <>
            <span
              className={`w-10 h-10 rounded-gj-md flex-shrink-0 inline-flex items-center
                justify-center ${toneStyles[kpi.tone]}`}
              aria-hidden
            >
              <Icon name={kpi.icon} size={18} />
            </span>
            <div className="min-w-0">
              <div className="text-fs-500 font-black leading-none">{kpi.value}</div>
              <div className="text-fs-200 text-color-text-secondary font-semibold mt-space-1">
                {kpi.label}
              </div>
              {kpi.hint && (
                <div
                  className={`text-fs-100 font-black mt-space-1 ${
                    hintStyles[kpi.hintTone ?? 'neutral']
                  }`}
                >
                  {kpi.hint}
                </div>
              )}
            </div>
          </>
        )
        return clickable ? (
          <Link
            key={kpi.label}
            href={kpi.href!}
            aria-label={`${kpi.label} — voir le détail`}
            className={cardClass}
          >
            {inner}
          </Link>
        ) : (
          <div key={kpi.label} className={baseCard}>
            {inner}
          </div>
        )
      })}
    </section>
  )
}
