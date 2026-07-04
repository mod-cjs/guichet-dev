/** Anneau de complétion de profil (data-viz, server). GUIC-499. */
export function ProfilRing({ pct, size = 34 }: { pct: number; size?: number }) {
  const stroke = size >= 60 ? 6 : 3.5
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c
  const color = pct >= 70 ? 'var(--gj-green)' : pct >= 40 ? 'var(--gj-yellow-deep, var(--gj-yellow))' : 'var(--gj-red)'
  return (
    <span className="relative inline-flex items-center justify-center" style={{ width: size, height: size }} title={`Profil ${pct}%`}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--gj-line)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${dash} ${c}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <span className="absolute font-black" style={{ fontSize: size >= 60 ? 15 : 9, color: 'var(--gj-ink)' }}>{pct}%</span>
    </span>
  )
}
