import { HTMLAttributes } from 'react'

type BadgeVariant = 'teal' | 'yellow' | 'red' | 'blue' | 'green' | 'grey' | 'new'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
  /**
   * GUIC-689 — Lot C2.3 : bordure 1px assortie à la teinte du point de
   * statut (réf. `component-kit.jsx` `pill()`). `false` par défaut — ne
   * change pas le rendu des call sites existants.
   */
  bordered?: boolean
}

const VARIANTS: Record<BadgeVariant, string> = {
  teal:   'bg-gj-teal-soft text-gj-teal-deep',
  yellow: 'bg-gj-yellow-soft text-gj-yellow-ink',
  red:    'bg-gj-red-soft text-gj-red-ink',
  blue:   'bg-gj-blue-soft text-gj-blue-ink',
  green:  'bg-gj-green-soft text-gj-green-ink',
  grey:   'bg-gj-bg text-gj-grey',
  new:    'bg-gj-teal text-white',
}

const BORDER: Record<BadgeVariant, string> = {
  teal:   'border-gj-teal-deep',
  yellow: 'border-gj-yellow-deep',
  red:    'border-gj-red',
  blue:   'border-gj-blue',
  green:  'border-gj-green',
  grey:   'border-gj-line-strong',
  new:    'border-gj-teal-deep',
}

export function Badge({ variant = 'teal', bordered = false, children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-[5px] py-[2px] rounded-[3px]
        text-fs-100 font-bold leading-none
        ${VARIANTS[variant]} ${bordered ? `border ${BORDER[variant]}` : ''} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
