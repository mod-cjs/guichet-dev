'use client'
import { ReactNode, useEffect, useCallback } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  maxWidth?: string
}

export function Modal({ isOpen, onClose, title, children, maxWidth = 'max-w-[460px]' }: ModalProps) {
  const handleEsc = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
    }
  }, [isOpen, handleEsc])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--gj-z-overlay)' }}>
      <div className="absolute inset-0 bg-black/50" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal
        className={`relative bg-white rounded-gj-2xl shadow-gj-lg w-full max-w-full mx-space-4 p-space-5
          max-h-[85dvh] overflow-y-auto ${maxWidth}`}
      >
        <div className="flex items-start justify-between mb-space-3">
          {title && <h2 className="text-fs-600 font-black text-color-text-primary">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="ml-auto text-gj-grey hover:text-gj-ink transition-colors
              min-h-[var(--tap-min)] min-w-[var(--tap-min)] flex items-center justify-center
              rounded-gj-pill"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
