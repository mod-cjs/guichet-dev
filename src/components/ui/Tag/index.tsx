import { HTMLAttributes } from 'react'

type TagVariant = 'cjs' | 'partner' | 'urgent' | 'new' | 'confirmed' | 'planned' | 'online'

interface TagProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: TagVariant
}

const VARIANTS: Record<TagVariant, string> = {
  cjs:       'bg-gj-teal-soft text-gj-teal-deep',
  partner:   'bg-gj-yellow-soft text-gj-yellow-ink',
  urgent:    'bg-gj-red-soft text-gj-red-ink',
  new:       'bg-gj-teal text-white',
  confirmed: 'bg-gj-teal-soft text-gj-teal-deep',
  planned:   'bg-gj-yellow-soft text-gj-yellow-ink',
  online:    'bg-gj-blue-soft text-gj-blue-ink',
}

export function Tag({ variant = 'cjs', children, className = '', ...props }: TagProps) {
  return (
    <span
      className={`inline-flex items-center gap-[3px] px-[8px] py-[3px]
        rounded-gj-pill text-fs-100 font-bold leading-none
        ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </span>
  )
}
