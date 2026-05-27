'use client'
import { ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'

interface SheetProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  /** 'bottom' = bottom-sheet partout · 'side' = bottom mobile / slide-over droit desktop. */
  variant?: 'bottom' | 'side'
  /** Hauteur max du panel mobile en pourcentage du viewport (défaut 94 — design v2). */
  maxHeightPct?: number
  children: ReactNode
}

/** Seuil de glissement (px) au-delà duquel le bottom-sheet se ferme. */
const SWIPE_CLOSE_THRESHOLD = 90
const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Panneau coulissant (GUIC-20/21, refonte v2 GUIC-173) — bottom-sheet sur
 * mobile, slide-over latéral 620px sur desktop quand `variant='side'`.
 *
 * v2 :
 * - radius top `--gj-r-2xl`, overlay `--gj-overlay`, motion `--motion-base`
 * - focus trap minimal (Tab/Shift+Tab restent dans le panel)
 * - restitution du focus à la fermeture sur l'élément déclencheur
 * - ARIA dialog + aria-modal + aria-labelledby si title fourni
 */
export function Sheet({
  isOpen,
  onClose,
  title,
  variant = 'side',
  maxHeightPct = 94,
  children,
}: SheetProps) {
  const [shown, setShown] = useState(false)
  const [dragY, setDragY] = useState(0)
  const dragStart = useRef<number | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const returnFocusRef = useRef<HTMLElement | null>(null)
  const titleId = useId()

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
        return
      }
      if (e.key !== 'Tab' || !panelRef.current) return
      const focusables = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1)
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    },
    [onClose],
  )

  useEffect(() => {
    if (!isOpen) return
    returnFocusRef.current = (document.activeElement as HTMLElement) ?? null
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeyDown)
    const id = requestAnimationFrame(() => {
      setShown(true)
      // Move focus inside the dialog (first focusable, else the panel itself)
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    })
    const restore = returnFocusRef.current
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(id)
      setShown(false)
      setDragY(0)
      // Restitution du focus au déclencheur (s'il existe toujours dans le DOM)
      if (restore && document.body.contains(restore)) {
        try { restore.focus() } catch { /* noop */ }
      }
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const panelPos =
    variant === 'side'
      ? 'inset-x-0 bottom-0 md:inset-y-0 md:left-auto md:right-0 md:w-[620px] md:max-w-full'
      : 'inset-x-0 bottom-0'
  const panelRadius = 'rounded-t-gj-2xl' + (variant === 'side' ? ' md:rounded-none' : '')
  const closedTransform =
    variant === 'side'
      ? 'translate-y-full md:translate-y-0 md:translate-x-full'
      : 'translate-y-full'

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
        className={`absolute inset-0 transition-opacity duration-[var(--motion-base)] ease-[var(--motion-ease)]
          ${shown ? 'opacity-100' : 'opacity-0'}`}
        style={{ background: 'var(--gj-overlay)' }}
        onClick={onClose}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? titleId : undefined}
        aria-label={title ? undefined : 'Panneau'}
        tabIndex={-1}
        className={`absolute ${panelPos} ${panelRadius}
          bg-white shadow-gj-lg flex flex-col md:max-h-full
          transition-transform duration-[var(--motion-base)] ease-[var(--motion-ease)]
          ${shown ? 'translate-x-0 translate-y-0' : closedTransform}`}
        style={{
          paddingBottom: 'var(--safe-bottom)',
          maxHeight: `${maxHeightPct}%`,
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
            <h2 id={titleId} className="text-fs-500 font-black text-color-text-primary">{title}</h2>
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
