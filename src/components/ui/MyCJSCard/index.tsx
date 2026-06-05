import { Icon } from '@/components/ui/Icon'

/**
 * QR placeholder déterministe — pattern visuel purement décoratif basé sur `cjsUid`.
 *
 * Phase 4 (TODO) : remplacer par un QR signé HMAC côté serveur
 * (cf. spec Q5 GUIC-193). On garde ici un rendu stable et reproductible
 * pour permettre de tester l'intégration visuelle sans lib externe.
 */
function QrPlaceholder({ seed, size = 140 }: { seed: string; size?: number }) {
  const cells = 21

  // Hash type djb2 — stable & déterministe sur le cjsUid.
  const hash = (i: number) => {
    let h = 5381
    for (let k = 0; k < seed.length; k++) h = ((h << 5) + h + seed.charCodeAt(k) + i) | 0
    return Math.abs(h)
  }

  const filled = new Set<string>()
  const fillRect = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) filled.add(`${x},${y}`)
  }
  const clearRect = (x0: number, y0: number, w: number, h: number) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) filled.delete(`${x},${y}`)
  }
  const finder = (x: number, y: number) => {
    fillRect(x, y, 7, 7)
    clearRect(x + 1, y + 1, 5, 5)
    fillRect(x + 2, y + 2, 3, 3)
  }

  finder(0, 0)
  finder(cells - 7, 0)
  finder(0, cells - 7)

  for (let y = 0; y < cells; y++) {
    for (let x = 0; x < cells; x++) {
      const inFinder =
        (x < 8 && y < 8) || (x > cells - 9 && y < 8) || (x < 8 && y > cells - 9)
      if (inFinder) continue
      if (hash(y * cells + x) % 100 < 48) filled.add(`${x},${y}`)
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${cells} ${cells}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="QR de membre CJS (placeholder)"
      className="block bg-white rounded-gj-sm"
    >
      <rect x={0} y={0} width={cells} height={cells} fill="#fff" />
      {[...filled].map((k) => {
        const [x, y] = k.split(',').map(Number)
        return <rect key={k} x={x} y={y} width={1} height={1} fill="#0A2A24" />
      })}
    </svg>
  )
}

export interface MyCJSCardProps {
  /** Identifiant SSO (`sub`) — sert de seed pour le QR + matricule. */
  cjsUid: string
  /** Prénom membre. */
  prenom: string
  /** Nom membre. */
  nom: string
  /** Centre de rattachement (ex: "CJS Tambacounda"). Optionnel. */
  centre?: string
  /** Date d'activation lisible (ex: "03/2025"). */
  activeSince?: string
  /** Surcharge CSS optionnelle. */
  className?: string
  /**
   * `standalone` (défaut) : carte hero pleine taille avec footer + glow.
   * `compact` : variante condensée pour aside (pas de footer décoratif).
   */
  variant?: 'standalone' | 'compact'
}

/**
 * MyCJSCard — carte de membre CJS réutilisable (gradient teal-deep + QR placeholder).
 *
 * Utilisée par :
 *  - `/centres` (via `CarteCjsHero`)
 *  - `/jeune/mon-profil` (aside)
 *  - `/jeune/tableau-de-bord` (aside)
 *
 * Phase 2B (MVP) : QR purement décoratif déterministe (seed = cjsUid).
 * Phase 4 : à remplacer par un payload signé HMAC server-side
 * (cf. décision Q5 spec GUIC-193).
 */
export function MyCJSCard({
  cjsUid,
  prenom,
  nom,
  centre,
  activeSince = '03/2025',
  className = '',
  variant = 'standalone',
}: MyCJSCardProps) {
  const initials = ((prenom?.[0] ?? '?') + (nom?.[0] ?? '?')).toUpperCase()
  const short = (cjsUid || '').replace(/-/g, '').slice(0, 6).toUpperCase() || '000000'
  const memberId = `GJS · ${initials} · ${short}`

  const displayName = `${prenom ?? ''} ${nom ?? ''}`.trim() || 'Invité·e'
  const isCompact = variant === 'compact'

  return (
    <article
      aria-label="Carte de membre CJS"
      className={`relative overflow-hidden rounded-gj-2xl text-white p-space-4 flex flex-col gap-space-3 ${className}`.trim()}
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
          className="px-2 py-[2px] rounded-gj-pill text-[10px] font-black uppercase tracking-wide bg-gj-yellow text-gj-ink"
        >
          Membre CJS
        </span>
      </header>

      <div className="flex items-center gap-space-3 relative">
        <div
          className="flex-shrink-0 rounded-gj-md p-2 bg-white"
          style={{ boxShadow: '0 4px 12px rgba(0,0,0,.18)' }}
        >
          <QrPlaceholder seed={cjsUid || displayName} size={isCompact ? 100 : 130} />
        </div>
        <div className="flex-1 min-w-0 flex flex-col gap-1">
          <h2 className="text-fs-500 font-black leading-tight m-0">{displayName}</h2>
          <div
            className="text-fs-300 font-bold tracking-wide"
            style={{
              fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
              color: 'var(--gj-yellow)',
            }}
          >
            {memberId}
          </div>
          <div
            className="flex flex-wrap gap-2 text-fs-200"
            style={{ color: 'rgba(255,255,255,.78)' }}
          >
            {centre && (
              <span className="inline-flex items-center gap-1">
                <Icon name="pin" size={12} style={{ color: 'var(--gj-yellow)' }} />
                {centre}
              </span>
            )}
            <span className="inline-flex items-center gap-1">
              <Icon name="calendar" size={12} style={{ color: 'var(--gj-yellow)' }} />
              Depuis {activeSince}
            </span>
          </div>
          {!isCompact && (
            <p className="text-fs-100 leading-relaxed mt-1" style={{ color: 'rgba(255,255,255,.55)' }}>
              Présente ce code à l&apos;accueil de n&apos;importe quel centre CJS.
            </p>
          )}
        </div>
      </div>

      {!isCompact && (
        <footer
          className="flex items-center gap-2 pt-space-2 text-fs-200 relative"
          style={{ borderTop: '1px solid rgba(255,255,255,.14)', color: 'rgba(255,255,255,.7)' }}
        >
          <span className="w-2 h-2 rounded-full" style={{ background: '#7BE5B5' }} />
          <span>Valable pour check-in CJS · Présenter à l&apos;accueil</span>
        </footer>
      )}
    </article>
  )
}
