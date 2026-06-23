'use client'

/**
 * Spark — mini sparkline SVG pour les cartes KPI admin.
 * Lot 11 — primitives data-viz (sans dépendance externe).
 */

export interface SparkProps {
  /** Série de valeurs numériques (au moins 1 point). */
  data: number[]
  /** Couleur de la courbe et du remplissage (token CSS ou couleur). */
  color?: string
  /** Largeur en px. */
  w?: number
  /** Hauteur en px. */
  h?: number
}

export function Spark({ data, color = 'var(--gj-teal)', w = 80, h = 28 }: SparkProps) {
  if (data.length === 0) return null

  // Cas d'un seul point : on duplique pour avoir une ligne plate.
  const series = data.length === 1 ? [data[0], data[0]] : data

  const max = Math.max(...series)
  const min = Math.min(...series)
  const rng = max - min || 1

  const pts = series.map((v, i) => [
    (i / (series.length - 1)) * w,
    h - ((v - min) / rng) * (h - 4) - 2,
  ])

  const d = pts
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`)
    .join(' ')

  const lastPt = pts[pts.length - 1]

  return (
    <svg
      width={w}
      height={h}
      viewBox={`0 0 ${w} ${h}`}
      style={{ display: 'block' }}
      aria-hidden="true"
    >
      <path d={`${d} L${w},${h} L0,${h} Z`} fill={color} opacity={0.12} />
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={lastPt[0]} cy={lastPt[1]} r={2.6} fill={color} />
    </svg>
  )
}
