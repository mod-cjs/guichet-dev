'use client'
import { useEffect } from 'react'

type ToastType = 'success' | 'error' | 'info'

interface ToastProps {
  message: string
  detail?: string
  type?: ToastType
  onClose: () => void
  duration?: number
}

const ICONS: Record<ToastType, string> = { success: '✅', error: '🔴', info: 'ℹ️' }

export function Toast({ message, detail, type = 'success', onClose, duration = 4000 }: ToastProps) {
  useEffect(() => {
    const t = setTimeout(onClose, duration)
    return () => clearTimeout(t)
  }, [onClose, duration])

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed left-space-3 right-space-3 flex items-center gap-space-3
        bg-[#0E2E25] text-white rounded-gj-lg p-space-3 shadow-gj-lg"
      style={{
        bottom: 'calc(72px + var(--safe-bottom) + var(--space-3))',
        zIndex: 'var(--gj-z-toast)',
      }}
    >
      <span className="text-fs-500 flex-shrink-0">{ICONS[type]}</span>
      <div className="flex-1 text-fs-300 leading-snug">
        <strong className="block font-bold">{message}</strong>
        {detail && <span className="opacity-85">{detail}</span>}
      </div>
      <button
        onClick={onClose}
        aria-label="Fermer"
        className="text-white opacity-70 hover:opacity-100 transition-opacity
          min-h-[36px] min-w-[36px] flex items-center justify-center text-fs-500"
      >
        ×
      </button>
    </div>
  )
}
