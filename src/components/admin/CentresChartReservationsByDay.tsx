interface Point {
  date: string
  count: number
}

interface Props {
  data: Point[]
  /** Largeur viewBox SVG (responsive via width:100%). */
  width?: number
  height?: number
}

/**
 * Line chart SVG natif (responsive). 0 dépendance.
 * Affiche le volume de réservations / jour sur la fenêtre fournie.
 */
export function CentresChartReservationsByDay({
  data,
  width = 600,
  height = 200,
}: Props) {
  if (data.length === 0) {
    return (
      <div className="text-fs-200 text-color-text-secondary p-space-4 text-center">
        Aucune donnée sur la période.
      </div>
    )
  }

  const pad = { top: 12, right: 12, bottom: 28, left: 36 }
  const innerW = width - pad.left - pad.right
  const innerH = height - pad.top - pad.bottom
  const maxCount = Math.max(1, ...data.map((d) => d.count))
  const stepX = data.length > 1 ? innerW / (data.length - 1) : 0

  const points = data.map((d, i) => {
    const x = pad.left + i * stepX
    const y = pad.top + innerH - (d.count / maxCount) * innerH
    return { x, y, ...d }
  })

  const path = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ')

  // 4 lignes horizontales de grille.
  const grid = [0, 0.25, 0.5, 0.75, 1].map((r) => {
    const y = pad.top + innerH - r * innerH
    return { y, label: Math.round(r * maxCount) }
  })

  const firstLabel = data[0]?.date.slice(5) ?? ''
  const lastLabel = data[data.length - 1]?.date.slice(5) ?? ''
  const midLabel = data[Math.floor(data.length / 2)]?.date.slice(5) ?? ''

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      width="100%"
      height={height}
      role="img"
      aria-label="Réservations par jour"
    >
      {grid.map((g, i) => (
        <g key={i}>
          <line
            x1={pad.left}
            x2={width - pad.right}
            y1={g.y}
            y2={g.y}
            stroke="var(--gj-line)"
            strokeWidth={1}
          />
          <text
            x={pad.left - 6}
            y={g.y + 3}
            textAnchor="end"
            fontSize={10}
            fill="var(--gj-text-secondary, #777)"
          >
            {g.label}
          </text>
        </g>
      ))}
      <path
        d={path}
        fill="none"
        stroke="var(--gj-teal)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={2.5} fill="var(--gj-teal)">
          <title>{`${p.date} : ${p.count}`}</title>
        </circle>
      ))}
      <text
        x={pad.left}
        y={height - 8}
        fontSize={10}
        fill="var(--gj-text-secondary, #777)"
      >
        {firstLabel}
      </text>
      <text
        x={pad.left + innerW / 2}
        y={height - 8}
        textAnchor="middle"
        fontSize={10}
        fill="var(--gj-text-secondary, #777)"
      >
        {midLabel}
      </text>
      <text
        x={width - pad.right}
        y={height - 8}
        textAnchor="end"
        fontSize={10}
        fill="var(--gj-text-secondary, #777)"
      >
        {lastLabel}
      </text>
    </svg>
  )
}
