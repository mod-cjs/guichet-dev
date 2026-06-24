'use client'

/**
 * Donut — donut chart SVG avec centre dynamique.
 * Lot 11 — primitives data-viz admin (sans dépendance externe).
 */

export interface DonutSegment {
  label: string
  value: number
  color: string
}

export interface DonutProps {
  data: DonutSegment[]
  /** Total affiché au centre (ex : nombre total de comptes). */
  total?: number
  /** Taille en px (carré). */
  size?: number
  /** Épaisseur de l'anneau. */
  thickness?: number
}

export function Donut({ data, total, size = 160, thickness = 26 }: DonutProps) {
  const totalVal = data.reduce((s, d) => s + d.value, 0) || 1
  const r = (size - thickness) / 2
  const c = 2 * Math.PI * r

  const centerLabel = total != null
    ? total >= 1000
      ? `${Math.round(total / 1000)}K`
      : String(total)
    : String(totalVal >= 1000 ? `${Math.round(totalVal / 1000)}K` : totalVal)

  let acc = 0
  const segments = data.map((d) => {
    const frac = d.value / totalVal
    const dash = frac * c
    const offset = -acc * c
    acc += frac
    return { ...d, dash, offset }
  })

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
        {segments.map((seg, i) => (
          <circle
            key={i}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={seg.color}
            strokeWidth={thickness}
            strokeDasharray={`${seg.dash} ${c - seg.dash}`}
            strokeDashoffset={seg.offset}
          />
        ))}
      </g>
      <text
        x="50%"
        y="46%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: size * 0.16, fontWeight: 900, fill: 'var(--gj-ink)' }}
      >
        {centerLabel}
      </text>
      <text
        x="50%"
        y="62%"
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: size * 0.07, fontWeight: 700, fill: 'var(--gj-grey)' }}
      >
        comptes
      </text>
    </svg>
  )
}
