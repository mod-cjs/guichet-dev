/**
 * StepBar — barre de progression accessible (onboarding / formulaires multi-étapes).
 *
 * Conforme à `design-guichet-v2/phone.jsx` StepBar :
 * - barre fond `var(--gj-bg)`, fill `var(--gj-teal)` width = step/total
 * - label gauche ("Étape X / Y") + pourcentage droite, caption uppercase
 * - bg white, padding-top "10px 16px 6px"
 *
 * A11y : role="progressbar" + aria-value{now,min,max} + aria-valuetext.
 */
export interface StepBarProps {
  /** Étape courante (1-indexed, clampée [0, total]). */
  step: number
  /** Total d'étapes. */
  total: number
  /** Label personnalisé (défaut `Étape ${step} / ${total}`). */
  label?: string
  /** Sticky top. */
  sticky?: boolean
  className?: string
}

export function StepBar({ step, total, label, sticky = false, className = '' }: StepBarProps) {
  const safeTotal = Math.max(1, total)
  const clamped = Math.min(Math.max(0, step), safeTotal)
  const pct = (clamped / safeTotal) * 100
  const text = label ?? `Étape ${clamped} / ${safeTotal}`

  return (
    <div
      className={className}
      style={{
        padding: '10px 16px 6px',
        background: '#fff',
        flexShrink: 0,
        position: sticky ? 'sticky' : undefined,
        top: sticky ? 0 : undefined,
        zIndex: sticky ? 5 : undefined,
      }}
    >
      <div
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={safeTotal}
        aria-valuetext={text}
        style={{
          height: 4,
          background: 'var(--gj-bg)',
          borderRadius: 3,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'var(--gj-teal-deep)',
            borderRadius: 3,
            transition: 'width .35s ease',
          }}
        />
      </div>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginTop: 6,
          fontSize: 10,
          color: 'var(--gj-grey)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '.5px',
        }}
      >
        <span>{text}</span>
        <span aria-hidden>{Math.round(pct)} %</span>
      </div>
    </div>
  )
}
