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

export function SkeletonCard() {
  return (
    <div className="bg-white border-[1.5px] border-gj-line rounded-gj-xl p-space-3">
      <Skeleton height="18px" width="75%" className="mb-space-2" />
      <Skeleton height="14px" width="90%" className="mb-space-2" />
      <Skeleton height="14px" width="50%" className="mb-space-3" />
      <div className="flex gap-space-2">
        <Skeleton height="44px" style={{ flex: 1 }} />
        <Skeleton height="44px" width="44px" />
      </div>
    </div>
  )
}
