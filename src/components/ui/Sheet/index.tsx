'use client'
import { ReactNode, useCallback, useEffect, useRef, useState } from 'react'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  /** 'bottom' = bottom-sheet partout · 'side' = bottom mobile / slide-over droit desktop. */
  variant?: 'bottom' | 'side'
  children: ReactNode
}

/** Seuil de glissement (px) au-delà duquel le bottom-sheet se ferme. */
const SWIPE_CLOSE_THRESHOLD = 90

/**
 * Panneau coulissant (GUIC-20) — bottom-sheet sur mobile, slide-over latéral
 * sur desktop quand `variant='side'`. Réutilisé par le détail d'opportunité (GUIC-21).
 * Fermeture : overlay, Échap, et glissement vers le bas du grab handle (mobile).
 */
export function Sheet({ isOpen, onClose, title, variant = 'side', children }: SheetProps) {
  const [shown, setShown] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)

  const handleEsc = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEsc)
    const id = requestAnimationFrame(() => setShown(true))
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', handleEsc)
      cancelAnimationFrame(id)
      setShown(false)
      setDragY(0)
    }
  }, [isOpen, handleEsc])

  if (!isOpen) return null

  const panelPos =
    variant === 'side'
      ? 'inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[480px] md:max-w-full'
      : 'inset-x-0 bottom-0'
  const panelRadius = 'rounded-t-gj-2xl' + (variant === 'side' ? ' md:rounded-none' : '')
  const closedTransform =
    variant === 'side'
      ? 'translate-y-full md:translate-y-0 md:translate-x-full'
      : 'translate-y-full'

  // Glissement vers le bas sur le grab handle → fermeture (mobile uniquement).
  const onTouchStart = (e: React.TouchEvent) => {
    dragStart.current = e.touches[0].clientY
  }
  const onTouchMove = (e: React.TouchEvent) => {
    if (dragStart.current === null) return
    const delta = e.touches[0].clientY - dragStart.current
    if (delta > 0) setDragY(delta)
  }
  const onTouchEnd = () => {
    if (dragY > SWIPE_CLOSE_THRESHOLD) onClose()
    setDragY(0)
    dragStart.current = null
  }

  return (
    <div className="fixed inset-0" style={{ zIndex: 'var(--gj-z-overlay)' }}>
      <div
        className={`absolute inset-0 bg-black/55 transition-opacity duration-200
          ${shown ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className={`absolute ${panelPos} ${panelRadius}
          bg-white shadow-gj-lg flex flex-col max-h-[85%] md:max-h-full
          transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)]
          ${shown ? 'translate-x-0 translate-y-0' : closedTransform}`}
        style={{
          paddingBottom: 'var(--safe-bottom)',
          ...(dragY > 0 ? { transform: `translateY(${dragY}px)`, transition: 'none' } : {}),
        }}
      >
        <div
          className={`${variant === 'side' ? 'md:hidden' : ''} pt-space-2 pb-space-1
            flex justify-center cursor-grab touch-none`}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <span className="w-12 h-[5px] rounded-full bg-gj-line-strong" />
        </div>
        {title && (
          <div className="flex items-center justify-between px-space-4 py-space-3 border-b border-gj-line">
            <h2 className="text-fs-500 font-black text-color-text-primary">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Fermer"
              className="min-h-[var(--tap-min)] min-w-[var(--tap-min)] flex items-center justify-center
                text-gj-grey hover:text-gj-ink rounded-gj-pill"
            >
              ✕
            </button>
          </div>
        )}
        <div className="overflow-y-auto px-space-4 py-space-3">{children}</div>
      </div>
    </div>
  )
}
