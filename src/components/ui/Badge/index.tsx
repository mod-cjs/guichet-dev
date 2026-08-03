import { HTMLAttributes } from 'react'

type BadgeVariant = 'teal' | 'yellow' | 'red' | 'blue' | 'cyan' | 'green' | 'grey' | 'new'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const VARIANTS: Record<BadgeVariant, string> = {
  teal:   'bg-gj-teal-soft text-gj-teal-deep',
  yellow: 'bg-gj-yellow-soft text-gj-yellow-ink',
  red:    'bg-gj-red-soft text-gj-red-ink',
  blue:   'bg-gj-blue-soft text-gj-blue-ink',
  cyan:   'bg-gj-cyan-soft text-gj-cyan-ink',
  green:  'bg-gj-green-soft text-gj-green-ink',
  grey:   'bg-gj-bg text-gj-grey',
  new:    'bg-gj-teal text-white',
}

export function Badge({ variant = 'teal', children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-[5px] py-[2px] rounded-[3px]
        text-fs-100 font-bold leading-none
        ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
