'use client'

import { useRef } from 'react'

export interface CentreRegionFilterProps {
  /** Liste des régions disponibles (ex: ['Tambacounda', 'Dakar']). */
  regions: string[]
  /** Valeur active : 'all' ou nom de région. */
  value: string
  onChange: (v: string) => void
  /**
   * Compteur de centres par région (ex: { Dakar: 3, Thiès: 1 }).
   * Affiché en suffixe `(N)` discret sur chaque chip (sauf "Toutes").
   */
  counts?: Record<string, number>
  className?: string
}

/**
 * <CentreRegionFilter> — chips horizontaux de filtrage par région.
 *
 * Pattern chips déjà validé projet (pas d'`overflow-x-auto` sur container nav).
 * ARIA `role="radiogroup"` + `aria-checked` sur chaque chip.
 * Tap-min 44px préservé via `minHeight` (padding visuel réduit pour densité).
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 2.
 */
export function CentreRegionFilter({
  regions,
  value,
  onChange,
  counts,
  className = '',
}: CentreRegionFilterProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const all = ['all', ...regions]

  const handleKey = (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    e.preventDefault()
    const next = e.key === 'ArrowRight' ? (idx + 1) % all.length : (idx - 1 + all.length) % all.length
    onChange(all[next])
    const root = listRef.current
    if (root) {
      const buttons = root.querySelectorAll<HTMLButtonElement>('button[role="radio"]')
      buttons[next]?.focus()
    }
  }

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label="Filtrer les centres par région"
      className={`flex flex-wrap gap-2 ${className}`.trim()}
    >
      {all.map((r, idx) => {
        const isAll = r === 'all'
        const selected = value === r
        const count = !isAll && counts ? counts[r] : undefined
        return (
          <button
            key={r}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(r)}
            onKeyDown={(e) => handleKey(e, idx)}
            className="inline-flex items-center gap-1 text-fs-200 font-medium rounded-full whitespace-nowrap focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 transition-colors"
            style={{
              minHeight: 44,
              padding: '8px 14px',
              background: selected
                ? 'var(--gj-teal-deep)'
                : 'var(--gj-surface)',
              color: selected ? '#fff' : 'var(--gj-ink)',
              border: `1px solid ${
                selected ? 'var(--gj-teal-deep)' : 'var(--gj-line)'
              }`,
            }}
          >
            <span>{isAll ? 'Toutes' : r}</span>
            {typeof count === 'number' && (
              <span
                aria-hidden="true"
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  color: selected ? 'rgba(255,255,255,.78)' : 'var(--gj-grey)',
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
