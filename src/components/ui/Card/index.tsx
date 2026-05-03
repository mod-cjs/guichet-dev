import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padding?: boolean
}

export function Card({ padding = true, children, className = '', ...props }: CardProps) {
  return (
    <div
      className={`bg-white rounded-cjs shadow-sm border border-gray-100 ${padding ? 'p-6' : ''} ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}
