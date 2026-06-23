'use client'

/**
 * LineChart — graphique linéaire SVG avec axes légers.
 * Lot 11 — primitives data-viz admin (sans dépendance externe).
 */

export interface LineChartProps {
  /** Série de valeurs numériques. */
  data: number[]
  /** Labels de l'axe X (un par point). */
  labels?: string[]
  /** Couleur de la courbe. */
  color?: string
  /** Hauteur en px (largeur = 100% via viewBox). */
  h?: number
}

export function LineChart({
  data,
  labels,
  color = 'var(--gj-teal-deep)',
  h = 200,
}: LineChartProps) {
  if (data.length === 0) return null

  const series = data.length === 1 ? [data[0], data[0]] : data

  const w = 560
  const pad = { l: 8, r: 8, t: 14, b: 22 }
  const max = Math.max(...series)
  const min = Math.min(...series) * 0.96
  const rng = max - min || 1

  const px = (i: number) => pad.l + (i / (series.length - 1)) * (w - pad.l - pad.r)
  const py = (v: number) => pad.t + (1 - (v - min) / rng) * (h - pad.t - pad.b)

  const d = series
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${py(v).toFixed(1)}`)
    .join(' ')

  const lastX = px(series.length - 1)
  const firstX = px(0)
  const bottomY = h - pad.b

  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      style={{ width: '100%', display: 'block' }}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      {/* Axes horizontaux */}
      {([0, 0.5, 1] as const).map((g, i) => (
        <line
          key={i}
          x1={pad.l}
          x2={w - pad.r}
          y1={pad.t + g * (h - pad.t - pad.b)}
          y2={pad.t + g * (h - pad.t - pad.b)}
          stroke="var(--gj-line)"
          strokeWidth={1}
        />
      ))}
      {/* Remplissage */}
      <path
        d={`${d} L${lastX},${bottomY} L${firstX},${bottomY} Z`}
        fill={color}
        opacity={0.1}
      />
      {/* Courbe */}
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Points */}
      {series.map((v, i) => (
        <circle
          key={i}
          cx={px(i)}
          cy={py(v)}
          r={3.5}
          fill="var(--gj-surface)"
          stroke={color}
          strokeWidth={2}
        />
      ))}
      {/* Labels X */}
      {labels?.map((l, i) => (
        <text
          key={i}
          x={px(i)}
          y={h - 6}
          textAnchor="middle"
          style={{ fontSize: 10, fill: 'var(--gj-grey)', fontWeight: 700 }}
        >
          {l}
        </text>
      ))}
    </svg>
  )
}
