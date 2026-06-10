'use client'

import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export interface QRBadgeProps {
  /** URL à encoder (typiquement `https://guichetjeunesse.sn/checkin/v1/<jwt>`). */
  url: string
  /** Taille en px (côté). Défaut : 256. */
  size?: number
  /** Date d'expiration du token — déclenche le countdown. */
  expiresAt?: Date
  /** Afficher le compte à rebours. Requiert `expiresAt`. */
  showCountdown?: boolean
  /** Callback rafraîchir (bouton visible si token expiré). */
  onRefreshClick?: () => void
  className?: string
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0m 0s'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${s}s`
}

/**
 * <QRBadge> — affiche un QR code généré côté client via la lib `qrcode`.
 * Utilisé par `<MyCJSCard>` pour le check-in CJS (JWT HS256 rotatif 15 min,
 * cf. ADR-002).
 *
 * - Génération asynchrone (`QRCode.toDataURL`) avec skeleton pendant le rendu
 * - Countdown 1s si `expiresAt + showCountdown` — rouge si < 2 min restant
 * - Bouton "Rafraîchir" si `onRefreshClick` ET token expiré
 * - `alt` explicite sur l'image
 */
export function QRBadge({
  url,
  size = 256,
  expiresAt,
  showCountdown = false,
  onRefreshClick,
  className = '',
}: QRBadgeProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [now, setNow] = useState<number>(() => Date.now())

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, { width: size, errorCorrectionLevel: 'M', margin: 1 })
      .then((dataUrl) => {
        if (!cancelled) setSrc(dataUrl)
      })
      .catch((e) => {
        console.error('[QRBadge] échec génération QR', e)
      })
    return () => {
      cancelled = true
    }
  }, [url, size])

  useEffect(() => {
    if (!showCountdown || !expiresAt) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [showCountdown, expiresAt])

  const remainingMs = expiresAt ? expiresAt.getTime() - now : 0
  const expired = Boolean(expiresAt) && remainingMs <= 0
  const urgent = Boolean(expiresAt) && remainingMs > 0 && remainingMs < 120_000

  return (
    <div className={`inline-flex flex-col items-center gap-2 ${className}`.trim()}>
      {src ? (
        <img
          src={src}
          alt="QR code de check-in carte CJS — code temporaire"
          width={size}
          height={size}
          style={{ display: 'block', background: '#fff', borderRadius: 8 }}
        />
      ) : (
        <div
          aria-hidden="true"
          data-testid="qr-badge-skeleton"
          className="animate-pulse rounded-gj-sm"
          style={{ width: size, height: size, background: '#E5F0EC' }}
        />
      )}

      {showCountdown && expiresAt && !expired && (
        <span
          aria-live="polite"
          className="text-fs-200 font-bold"
          style={{ color: urgent ? 'var(--gj-red)' : 'var(--gj-ink)' }}
        >
          Expire dans {formatRemaining(remainingMs)}
        </span>
      )}

      {expired && (
        <span aria-live="polite" className="text-fs-200" style={{ color: 'var(--gj-red)' }}>
          Code expiré
        </span>
      )}

      {onRefreshClick && expired && (
        <button
          type="button"
          onClick={onRefreshClick}
          className="px-3 py-1 rounded-gj-pill text-fs-200 font-bold"
          style={{
            background: 'var(--gj-teal-deep)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          Rafraîchir
        </button>
      )}
    </div>
  )
}
