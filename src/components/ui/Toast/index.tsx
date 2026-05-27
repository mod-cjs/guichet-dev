'use client'
import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  detail?: string
  type?: ToastType
  onClose: () => void
  duration?: number
  /** Hauteur de la barre fixe sous le toast (ex: BottomNav = 72). Défaut : 0. */
  bottomOffset?: number
}

const ICONS: Record<ToastType, { symbol: string; label: string }> = {
  success: { symbol: '✓', label: 'Succès' },
  error:   { symbol: '✕', label: 'Erreur' },
  info:    { symbol: 'i', label: 'Information' },
}

const COLORS: Record<ToastType, string> = {
  success: 'bg-gj-green',
  error:   'bg-gj-red',
  info:    'bg-gj-ink-teal',
}

export function Toast({ message, detail, type = 'success', onClose, duration = 4000, bottomOffset = 0 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  const icon = ICONS[type]

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed left-space-3 right-space-3 flex items-center gap-space-3
        text-white rounded-gj-lg p-space-3 shadow-gj-lg ${COLORS[type]}`}
      style={{
        bottom: bottomOffset
          ? `calc(${bottomOffset}px + var(--safe-bottom) + var(--space-3))`
          : `calc(var(--safe-bottom) + var(--space-3))`,
        zIndex: 'var(--gj-z-toast)',
      }}
    >
      <span
        className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center
          text-fs-200 font-black flex-shrink-0"
        aria-label={icon.label}
        role="img"
      >
        {icon.symbol}
      </span>
      <div className="flex-1 text-fs-300 leading-snug">
        <strong className="block font-bold">{message}</strong>
        {detail && <span className="opacity-85">{detail}</span>}
      </div>
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="text-white opacity-70 hover:opacity-100 transition-opacity
          min-h-[var(--tap-min)] min-w-[var(--tap-min)] flex items-center justify-center"
      >
        ×
      </button>
    </div>
  )
}
