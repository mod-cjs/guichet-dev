'use client'

import { useId } from 'react'

export interface PeopleStepperProps {
  value: number
  min?: number
  max: number
  unit?: string
  onChange: (n: number) => void
  className?: string
  /** Id du label associé (a11y). */
  ariaLabel?: string
}

/**
 * <PeopleStepper> — input numérique avec boutons –/+.
 *
 * Tap-min 44px. `aria-live="polite"` sur la valeur pour annoncer changement.
 * Spec : M4-centres-lot7.md §5 Wave 4.
 */
export function PeopleStepper({
  value,
  min = 1,
  max,
  unit,
  onChange,
  className = '',
  ariaLabel = 'Nombre de personnes',
}: PeopleStepperProps) {
  const id = useId()
  const clamp = (n: number) => Math.max(min, Math.min(max, n))

  const dec = () => onChange(clamp(value - 1))
  const inc = () => onChange(clamp(value + 1))

  return (
    <div
      className={`flex items-stretch ${className}`.trim()}
      style={{
        border: '1.5px solid var(--gj-line)',
        borderRadius: 9,
        minHeight: 46,
        background: 'var(--gj-bg)',
        overflow: 'hidden',
      }}
      role="group"
      aria-labelledby={id}
    >
      <span id={id} className="sr-only">
        {ariaLabel}
      </span>
      <button
        type="button"
        onClick={dec}
        disabled={value <= min}
        aria-label="Diminuer le nombre"
        style={{
          width: 44,
          minHeight: 44,
          border: 0,
          borderRight: '1.5px solid var(--gj-line)',
          background: 'var(--gj-surface)',
          cursor: value <= min ? 'not-allowed' : 'pointer',
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--gj-grey)',
          opacity: value <= min ? 0.5 : 1,
        }}
      >
        –
      </button>
      <span
        aria-live="polite"
        aria-atomic="true"
        style={{
          flex: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 15,
          fontWeight: 800,
          color: 'var(--gj-ink)',
          padding: '0 8px',
        }}
      >
        {value}
        {unit ? (
          <span
            style={{
              fontSize: 11.5,
              fontWeight: 600,
              color: 'var(--gj-grey)',
              marginLeft: 6,
            }}
          >
            {unit}
          </span>
        ) : null}
      </span>
      <button
        type="button"
        onClick={inc}
        disabled={value >= max}
        aria-label="Augmenter le nombre"
        style={{
          width: 44,
          minHeight: 44,
          border: 0,
          borderLeft: '1.5px solid var(--gj-line)',
          background: 'var(--gj-surface)',
          cursor: value >= max ? 'not-allowed' : 'pointer',
          fontSize: 18,
          fontWeight: 800,
          color: 'var(--gj-grey)',
          opacity: value >= max ? 0.5 : 1,
        }}
      >
        +
      </button>
    </div>
  )
}
