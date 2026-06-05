import { Icon } from '@/components/ui'

/**
 * QR placeholder décoratif — pseudo-pattern stable (pas de génération de QR signé).
 * TODO Phase 4 : remplacer par un QR HMAC signé (cf. spec Q5 GUIC-193).
 */
function QrPlaceholder({ size = 120 }: { size?: number }) {
  const cells = 21
  const cell = size / cells
  const filled: string[] = []

  const fillRect = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) filled.push(`${x},${y}`)
  }
  const finder = (x: number, y: number) => {
    fillRect(x, y, 7, 7)
    // ring effect
    for (let yy = y + 1; yy < y + 6; yy++)
      for (let xx = x + 1; xx < x + 6; xx++)
        filled.splice(filled.indexOf(`${xx},${yy}`), 1)
    fillRect(x + 2, y + 2, 3, 3)
  }

  finder(0, 0)
  finder(cells - 7, 0)
  finder(0, cells - 7)

  // Deterministic pseudo cells
  const seed = 'GJS-CJS-CARD'
  const hash = (i: number) => {
    let h = 5381
    for (let k = 0; k < seed.length; k++) h = ((h << 5) + h + seed.charCodeAt(k) + i) | 0
    return Math.abs(h)
  }
  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const inFinder =
        (x < 8 && y < 8) || (x > cells - 9 && y < 8) || (x < 8 && y > cells - 9)
      if (inFinder) continue
      if (hash(y * cells + x) % 100 < 48) filled.push(`${x},${y}`)
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role="img"
      aria-label="QR de membre CJS (placeholder)"
      className="block bg-white rounded-gj-sm"
    >
      <rect x={0} y={0} width={size} height={size} fill="#fff" />
      {filled.map((k, i) => {
        const [x, y] = k.split(',').map(Number)
        return (
          <rect key={i} x={x * cell} y={y * cell} width={cell} height={cell} fill="#0A2A24" />
        )
      })}
    </svg>
  )
}

export interface CarteCjsHeroProps {
  /** Nom complet du membre (ex : "Awa Diop"). Affiche "Invité·e" si absent. */
  userName?: string | null
  /** Identifiant lisible (ex : "GJS · AD · 23045"). */
  memberId?: string
  /** Centre de rattachement (ex : "CJS Tambacounda"). */
  centre?: string
  /** Date d'activation lisible (ex : "03/2025"). */
  activeSince?: string
}

/**
 * CarteCjsHero — carte de membre CJS (gradient teal-deep) avec QR placeholder.
 *
 * Phase 2B (MVP) : QR purement décoratif. Phase 4 le remplacera par un payload
 * signé HMAC côté serveur (cf. décision Q5 spec GUIC-193).
 */
export function CarteCjsHero({
  userName,
  memberId = 'GJS · 00000',
  centre = 'CJS Tambacounda',
  activeSince = '03/2025',
}: CarteCjsHeroProps) {
  const displayName = userName?.trim() || 'Invité·e'

  return (
    <article
      aria-label="Carte de membre CJS"
      className="relative overflow-hidden rounded-gj-2xl text-white p-space-4 flex flex-col gap-space-3"
      style={{
        backgroundImage:
          'linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal) 100%)',
      }}
    >
      <span
        aria-hidden="true"
        className="absolute pointer-events-none"
        style={{
          right: -50,
          top: -60,
          width: 220,
          height: 220,
          background: 'radial-gradient(circle, rgba(249,196,0,.18), transparent 60%)',
        }}
      />
      <header className="flex items-center justify-between relative">
        <span
          className="inline-flex items-center gap-1 text-fs-100 font-bold uppercase tracking-wide"
          style={{ color: 'var(--gj-yellow)' }}
        >
          <Icon name="pin" size={14} /> Carte CJS
        </span>
        <span
          className="px-2 py-[2px] rounded-gj-pill text-[10px] font-bold uppercase tracking-wide"
          style={{ background: 'rgba(0,0,0,.25)', color: 'var(--gj-yellow)' }}
        >
          Membre CJS
        </span>
      </header>

      <div className="flex items-center gap-space-3 relative">
        <div
          className="flex-shrink-0 rounded-gj-md p-2 bg-white"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}
        >
          <QrPlaceholder size={110} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <div className="text-fs-500 font-black leading-tight">{displayName}</div>
          <div
            className="text-fs-300 font-bold tracking-wide"
            style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', color: 'var(--gj-yellow)' }}
          >
            {memberId}
          </div>
          <div className="flex flex-wrap gap-2 text-fs-200" style={{ color: 'rgba(255,255,255,.78)' }}>
            <span className="inline-flex items-center gap-1">
              <Icon name="pin" size={12} style={{ color: 'var(--gj-yellow)' }} />
              {centre}
            </span>
            <span className="inline-flex items-center gap-1">
              <Icon name="calendar" size={12} style={{ color: 'var(--gj-yellow)' }} />
              Depuis {activeSince}
            </span>
          </div>
          <p className="text-fs-100 leading-relaxed mt-1" style={{ color: 'rgba(255,255,255,.55)' }}>
            Présente ce code à l&apos;accueil de n&apos;importe quel centre CJS.
          </p>
        </div>
      </div>

      <footer
        className="flex items-center gap-2 pt-space-2 text-fs-200 relative"
        style={{ borderTop: '1px solid rgba(255,255,255,.14)', color: 'rgba(255,255,255,.7)' }}
      >
        <span className="w-2 h-2 rounded-full" style={{ background: 'var(--gj-status-live)' }} />
        <span>QR placeholder · TODO Phase 4 signature HMAC</span>
      </footer>
    </article>
  )
}
