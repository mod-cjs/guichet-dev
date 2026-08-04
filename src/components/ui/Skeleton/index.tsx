import { HTMLAttributes } from 'react'

interface SkeletonProps extends HTMLAttributes<HTMLDivElement> {
  height?: string
  width?: string
  rounded?: string
}

export function Skeleton({ height = '14px', width = '100%', rounded = 'var(--gj-r-sm)', className = '', style, ...props }: SkeletonProps) {
  return (
    <div
      className={className}
      style={{
        height,
        width,
        borderRadius: rounded,
        background:
          'linear-gradient(90deg, var(--gj-skel-from) 0, var(--gj-skel-to) 40%, var(--gj-skel-from) 80%)',
        backgroundSize: '200px 100%',
        animation: 'gj-shimmer 1.4s infinite linear',
        ...style,
      }}
      aria-hidden
      {...props}
    />
  )
}

/**
 * GUIC-689 — Lot C2.6 : gabarit carte aligné sur `system-states.jsx` `SkCard`
 * — icône 48×48 à gauche, 2 lignes au centre, badge 74×34 à droite.
 */
export function SkeletonCard() {
  return (
    <div className="bg-white border-[1.5px] border-gj-line rounded-gj-xl p-space-4 flex items-center gap-space-3">
      <Skeleton height="48px" width="48px" rounded="12px" className="flex-shrink-0" />
      <div className="flex-1 flex flex-col gap-space-2 min-w-0">
        <Skeleton height="13px" width="62%" />
        <Skeleton height="11px" width="40%" />
      </div>
      <Skeleton height="34px" width="74px" rounded="9px" className="flex-shrink-0" />
    </div>
  )
}
