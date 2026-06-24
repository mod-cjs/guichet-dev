'use client'

/**
 * BarChart — histogramme vertical SVG.
 * Lot 11 — primitives data-viz admin (sans dépendance externe).
 */

export interface BarChartItem {
  /** Label mois (ex : "Jan"). */
  m: string
  /** Valeur numérique. */
  v: number
}

export interface BarChartProps {
  data: BarChartItem[]
  /** Couleur par défaut des barres. */
  color?: string
  /** Hauteur en px (largeur = 100% via viewBox). */
  h?: number
}

export function BarChart({ data, color = 'var(--gj-teal)', h = 200 }: BarChartProps) {
  if (data.length === 0) return null

  const w = 560
  const pad = { t: 14, b: 22 }
  const max = Math.max(...data.map((d) => d.v)) || 1
  const bw = (w / data.length) * 0.5

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', display: 'block' }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {data.map((item, i) => {
        const x = (i + 0.5) * (w / data.length)
        const bh = (item.v / max) * (h - pad.t - pad.b)
        const isLast = i === data.length - 1
        return (
          <g key={i}>
            <rect
              x={x - bw / 2}
              y={h - pad.b - bh}
              width={bw}
              height={bh}
              rx={5}
              fill={isLast ? 'var(--gj-teal-deep)' : color}
              opacity={isLast ? 1 : 0.55}
            />
            <text
              x={x}
              y={h - pad.b - bh - 5}
              textAnchor="middle"
              style={{ fontSize: 10, fill: 'var(--gj-ink)', fontWeight: 800 }}
            >
              {item.v}
            </text>
            <text
              x={x}
              y={h - 6}
              textAnchor="middle"
              style={{ fontSize: 10, fill: 'var(--gj-grey)', fontWeight: 700 }}
            >
              {item.m}
            </text>
          </g>
        )
      })}
    </svg>
  )
}
