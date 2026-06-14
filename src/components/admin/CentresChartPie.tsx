interface Slice {
  label: string
  count: number
}

interface Props {
  data: Slice[]
  /** "pie" plein ou "donut" anneau. */
  variant?: 'pie' | 'donut'
  size?: number
}

const PALETTE = [
  'var(--gj-teal)',
  'var(--gj-yellow)',
  'var(--gj-red)',
  'var(--gj-teal-deep, #0d5b5b)',
  'var(--gj-ink, #1a1a1a)',
]

/**
 * Pie/donut SVG natif (réutilisé pour byType + byStatut).
 * Affiche jusqu'à 8 segments avec légende à droite.
 */
export function CentresChartPie({ data, variant = 'pie', size = 160 }: Props) {
  const total = data.reduce((s, d) => s + d.count, 0)
  if (total === 0) {
    return (
      <div className="text-fs-200 text-color-text-secondary p-space-4 text-center">
        Aucune donnée.
      </div>
    )
  }

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 4
  const rInner = variant === 'donut' ? r * 0.55 : 0

  let cumul = 0
  const arcs = data.map((d, i) => {
    const startAngle = (cumul / total) * Math.PI * 2
    cumul += d.count
    const endAngle = (cumul / total) * Math.PI * 2
    const large = endAngle - startAngle > Math.PI ? 1 : 0
    const x1 = cx + r * Math.sin(startAngle)
    const y1 = cy - r * Math.cos(startAngle)
    const x2 = cx + r * Math.sin(endAngle)
    const y2 = cy - r * Math.cos(endAngle)
    let path: string
    if (rInner > 0) {
      const xi1 = cx + rInner * Math.sin(startAngle)
      const yi1 = cy - rInner * Math.cos(startAngle)
      const xi2 = cx + rInner * Math.sin(endAngle)
      const yi2 = cy - rInner * Math.cos(endAngle)
      path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${xi2} ${yi2} A ${rInner} ${rInner} 0 ${large} 0 ${xi1} ${yi1} Z`
    } else {
      path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
    }
    return { ...d, path, color: PALETTE[i % PALETTE.length] }
  })

  return (
    <div className="flex items-center gap-space-4 flex-wrap">
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        role="img"
        aria-label="Répartition"
      >
        {arcs.map((a, i) => (
          <path key={i} d={a.path} fill={a.color}>
            <title>{`${a.label} : ${a.count} (${((a.count / total) * 100).toFixed(1)}%)`}</title>
          </path>
        ))}
      </svg>
      <ul className="flex flex-col gap-1 min-w-[140px]">
        {arcs.map((a, i) => (
          <li
            key={i}
            className="flex items-center gap-2 text-fs-200 text-color-text-primary"
          >
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ background: a.color }}
              aria-hidden
            />
            <span className="flex-1">{a.label}</span>
            <span className="font-bold">{a.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
