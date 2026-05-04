import { HTMLAttributes } from 'react'

type CardAccent = 'none' | 'teal' | 'yellow' | 'red'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  accent?: CardAccent
  padding?: boolean
}

const ACCENTS: Record<CardAccent, string> = {
  none:   '',
  teal:   'border-l-[4px] border-l-gj-teal',
  yellow: 'border-l-[4px] border-l-gj-yellow',
  red:    'border-l-[4px] border-l-gj-red',
}

export function Card({ accent = 'none', padding = true, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white border-[1.5px] border-gj-line rounded-gj-lg
        ${ACCENTS[accent]}
        ${padding ? 'p-space-4' : ''}
        ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
