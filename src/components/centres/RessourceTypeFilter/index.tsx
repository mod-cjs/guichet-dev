'use client'

import { useRef } from 'react'

export type RessourceTypeValue =
  | 'Toutes'
  | 'Salle'
  | 'Vehicule'
  | 'Poste_info'

export interface RessourceTypeFilterProps {
  value: RessourceTypeValue
  onChange: (v: RessourceTypeValue) => void
  counts?: Partial<Record<RessourceTypeValue, number>>
  className?: string
}

const ITEMS: Array<{ id: RessourceTypeValue; label: string }> = [
  { id: 'Toutes', label: 'Toutes' },
  { id: 'Salle', label: 'Salles' },
  { id: 'Vehicule', label: 'Véhicules' },
  { id: 'Poste_info', label: 'Postes info' },
]

/**
 * <RessourceTypeFilter> — chips type ressource (W4).
 *
 * Pattern miroir de `<CentreRegionFilter>` (radiogroup ARIA, clavier ←/→).
 * Tap-min 44px préservé. Spec : M4-centres-lot7.md §5 Wave 4.
 */
export function RessourceTypeFilter({
  value,
  onChange,
  counts,
  className = '',
}: RessourceTypeFilterProps) {
  const listRef = useRef<HTMLDivElement | null>(null)

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next =
      e.key === 'ArrowRight'
        ? (idx + 1) % ITEMS.length
        : (idx - 1 + ITEMS.length) % ITEMS.length
    onChange(ITEMS[next].id)
    const root = listRef.current
    if (root) {
      const buttons = root.querySelectorAll<HTMLButtonElement>(
        'button[role="radio"]',
      )
      buttons[next]?.focus()
    }
  }

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label="Filtrer les ressources par type"
      className={`flex flex-wrap gap-2 ${className}`.trim()}
    >
      {ITEMS.map((it, idx) => {
        const selected = value === it.id
        const count = counts?.[it.id]
        return (
          <button
            key={it.id}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(it.id)}
            onKeyDown={(e) => handleKey(e, idx)}
            className="inline-flex items-center gap-1 text-fs-200 font-medium rounded-full whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
            style={{
              minHeight: 44,
              padding: '8px 14px',
              background: selected
                ? 'var(--gj-teal-deep)'
                : 'var(--gj-surface)',
              color: selected ? 'var(--gj-surface)' : 'var(--gj-ink)',
              border: `1px solid ${
                selected ? 'var(--gj-teal-deep)' : 'var(--gj-line)'
              }`,
              fontWeight: 800,
              fontSize: 12.5,
            }}
          >
            <span>{it.label}</span>
            {typeof count === 'number' && (
              <span
                aria-hidden="true"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: selected
                    ? 'rgba(255,255,255,.78)'
                    : 'var(--gj-grey)',
                }}
              >
                ({count})
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
