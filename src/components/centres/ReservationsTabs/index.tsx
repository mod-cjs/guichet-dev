'use client'

import { useCallback } from 'react'

export interface ReservationTab {
  key: string
  label: string
  count: number
}

export interface ReservationsTabsProps {
  value: string
  tabs: ReservationTab[]
  onChange: (key: string) => void
  /** ARIA label de la tablist. Défaut : "Filtres réservations". */
  ariaLabel?: string
  className?: string
}

/**
 * <ReservationsTabs> — bandeau de tabs (chips) pour filtrer la vue
 * `/jeune/mes-reservations-centres` (W5).
 *
 * Vrai `role="tablist"` ARIA, `flex-wrap` (jamais `overflow-x-auto`),
 * compteur (N) intégré au label, tap-min 44px. Tokens `gj-*`.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 5.
 */
export function ReservationsTabs({
  value,
  tabs,
  onChange,
  ariaLabel = 'Filtres réservations',
  className = '',
}: ReservationsTabsProps) {
  const handleClick = useCallback(
    (key: string) => () => {
      if (key !== value) onChange(key)
    },
    [onChange, value],
  )

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`flex flex-wrap gap-space-2 ${className}`.trim()}
    >
      {tabs.map((t) => {
        const selected = t.key === value
        return (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={`reservations-panel-${t.key}`}
            id={`reservations-tab-${t.key}`}
            tabIndex={selected ? 0 : -1}
            onClick={handleClick(t.key)}
            className={[
              'inline-flex items-center gap-2 px-3 text-fs-300 font-semibold leading-none',
              'rounded-gj-pill border-[1.5px] transition-colors duration-200',
              'min-h-[44px] cursor-pointer',
              'focus:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)]',
              selected
                ? 'bg-gj-teal-soft border-gj-teal-deep text-gj-teal-deep font-bold'
                : 'bg-gj-surface border-gj-line text-color-text-primary hover:border-gj-line-strong',
            ].join(' ')}
          >
            <span>{t.label}</span>
            <span
              aria-hidden="true"
              className="text-fs-200 opacity-80"
              style={{ fontVariantNumeric: 'tabular-nums' }}
            >
              ({t.count})
            </span>
          </button>
        )
      })}
    </div>
  )
}
