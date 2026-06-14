interface Item {
  centreId: string
  centreNom: string
  count: number
}

interface Props {
  data: Item[]
}

/**
 * Bar chart horizontal — top centres par volume de réservations.
 * Layout div/CSS (pas de SVG) pour faciliter labels longs + responsive.
 */
export function CentresChartTopCentres({ data }: Props) {
  if (data.length === 0) {
    return (
      <div className="text-fs-200 text-color-text-secondary p-space-4 text-center">
        Aucune réservation sur la période.
      </div>
    )
  }
  const max = Math.max(1, ...data.map((d) => d.count))
  return (
    <ul className="flex flex-col gap-space-3">
      {data.map((item) => {
        const pct = (item.count / max) * 100
        return (
          <li key={item.centreId} className="flex flex-col gap-1">
            <div className="flex justify-between items-baseline gap-space-2">
              <span className="text-fs-300 font-semibold text-color-text-primary truncate">
                {item.centreNom}
              </span>
              <span className="text-fs-300 font-bold text-color-text-primary">
                {item.count}
              </span>
            </div>
            <div className="h-2 bg-gj-line rounded-full overflow-hidden">
              <div
                className="h-full bg-gj-teal rounded-full"
                style={{ width: `${pct}%` }}
                role="progressbar"
                aria-valuenow={item.count}
                aria-valuemin={0}
                aria-valuemax={max}
              />
            </div>
          </li>
        )
      })}
    </ul>
  )
}
