import { HTMLAttributes } from 'react'

type BadgeVariant = 'vert' | 'or' | 'rouge' | 'gris'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant
}

const VARIANTS: Record<BadgeVariant, string> = {
  vert:  'bg-green-100 text-cjs-vert',
  or:    'bg-yellow-100 text-yellow-800',
  rouge: 'bg-red-100 text-cjs-rouge',
  gris:  'bg-gray-100 text-cjs-gris',
}

export function Badge({ variant = 'vert', children, className = '', ...props }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
