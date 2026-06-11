'use client'

import { useRef } from 'react'

export interface ReservationSlot {
  /** "HH:MM" */
  start: string
  /** "HH:MM" */
  end: string
  available: boolean
}

export interface ReservationSlotPickerProps {
  /** Format "HH:MM-HH:MM" ou null si non sélectionné. */
  value: string | null
  onChange: (slot: string | null) => void
  availableSlots: ReservationSlot[]
  className?: string
}

function formatLabel(start: string, end: string): string {
  return `${start.replace(':', 'h')} – ${end.replace(':', 'h')}`
}

function slotKey(s: ReservationSlot): string {
  return `${s.start}-${s.end}`
}

/**
 * <ReservationSlotPicker> — chips de créneaux horaires (W4).
 *
 * Slots `available: false` → grisé + non-cliquable. Pattern radiogroup ARIA,
 * tap-min 44px. Spec : M4-centres-lot7.md §5 Wave 4.
 */
export function ReservationSlotPicker({
  value,
  onChange,
  availableSlots,
  className = '',
}: ReservationSlotPickerProps) {
  const listRef = useRef<HTMLDivElement | null>(null)
  const selectable = availableSlots.filter((s) => s.available)

  const handleKey = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    idx: number,
  ) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
    if (selectable.length === 0) return
    e.preventDefault()
    const cur = selectable.findIndex((s) => slotKey(s) === value)
    const start = cur < 0 ? idx : cur
    const next =
      e.key === 'ArrowRight'
        ? (start + 1) % selectable.length
        : (start - 1 + selectable.length) % selectable.length
    const target = selectable[next]
    onChange(slotKey(target))
  }

  return (
    <div
      ref={listRef}
      role="radiogroup"
      aria-label="Créneau horaire"
      className={`flex flex-wrap gap-2 ${className}`.trim()}
    >
      {availableSlots.map((s, idx) => {
        const key = slotKey(s)
        const selected = value === key
        const disabled = !s.available
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-disabled={disabled}
            disabled={disabled}
            tabIndex={selected ? 0 : -1}
            onClick={() => !disabled && onChange(key)}
            onKeyDown={(e) => handleKey(e, idx)}
            className="inline-flex items-center justify-center"
            style={{
              minHeight: 44,
              padding: '10px 16px',
              borderRadius: 9,
              fontSize: 13,
              fontWeight: 800,
              cursor: disabled ? 'not-allowed' : 'pointer',
              background: disabled
                ? 'var(--gj-bg)'
                : selected
                ? 'var(--gj-teal-soft)'
                : 'var(--gj-surface)',
              border: selected
                ? '1.5px solid var(--gj-teal-deep)'
                : '1.5px solid var(--gj-line)',
              color: disabled
                ? 'var(--gj-grey)'
                : selected
                ? 'var(--gj-teal-deep)'
                : 'var(--gj-ink)',
              opacity: disabled ? 0.55 : 1,
            }}
          >
            {formatLabel(s.start, s.end)}
          </button>
        )
      })}
    </div>
  )
}
