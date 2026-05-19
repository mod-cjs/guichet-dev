const rtf = new Intl.RelativeTimeFormat('fr', { numeric: 'auto' })

const UNITS: Array<[Intl.RelativeTimeFormatUnit, number]> = [
  ['year',   60 * 60 * 24 * 365],
  ['month',  60 * 60 * 24 * 30],
  ['week',   60 * 60 * 24 * 7],
  ['day',    60 * 60 * 24],
  ['hour',   60 * 60],
  ['minute', 60],
]

export function timeAgo(isoDate: string, now: Date = new Date()): string {
  const diffSeconds = Math.round((new Date(isoDate).getTime() - now.getTime()) / 1000)
  const abs = Math.abs(diffSeconds)
  if (abs < 60) return rtf.format(0, 'second').replace(/0/, "à l'instant")

  for (const [unit, secs] of UNITS) {
    if (abs >= secs) {
      const value = Math.round(diffSeconds / secs)
      return rtf.format(value, unit)
    }
  }
  return rtf.format(diffSeconds, 'second')
}
