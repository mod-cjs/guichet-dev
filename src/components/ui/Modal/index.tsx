'use client'
import { ReactNode, useCallback, useEffect, useId, useRef, useState } from 'react'

export type ModalSize = 'sm' | 'md' | 'lg'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: ReactNode
  /** Taille du panel — `sm` 380px · `md` 560px · `lg` 680px. Défaut `md`. */
  size?: ModalSize
  /** Slot footer pour CTAs (boutons groupés en bas). */
  footer?: ReactNode
  /** Override raw max-width (compat ascendante). */
  maxWidth?: string
}

const SIZES: Record<ModalSize, string> = {
  sm: 'max-w-[380px]',
  md: 'max-w-[560px]',
  lg: 'max-w-[680px]',
}

const FOCUSABLE = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal — dialogue centré du design system v2.
 *
 * v2 :
 * - Sizes sm/md/lg (380 / 560 / 680 px)
 * - Header avec close button top-right, footer slot CTAs
 * - Overlay --gj-overlay, motion fade + scale via --motion-base
 * - Focus trap + restitution focus à la fermeture
 * - ARIA role=dialog + aria-modal + aria-labelledby si title
 */
export function Modal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  footer,
  maxWidth,
}: ModalProps) {
  const [shown, setShown] = useState(false)
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
      const first = panelRef.current?.querySelector<HTMLElement>(FOCUSABLE)
      first?.focus()
    })
    const restore = returnFocusRef.current
    return () => {
      document.body.style.overflow = ''
      document.removeEventListener('keydown', handleKeyDown)
      cancelAnimationFrame(id)
      setShown(false)
      if (restore && document.body.contains(restore)) {
        try { restore.focus() } catch { /* noop */ }
      }
    }
  }, [isOpen, handleKeyDown])

  if (!isOpen) return null

  const sizeClass = maxWidth ?? SIZES[size]

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 'var(--gj-z-overlay)' }}>
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
        tabIndex={-1}
        className={`relative bg-white rounded-gj-2xl shadow-gj-lg w-full mx-space-4
          max-h-[85dvh] flex flex-col
          transition-[transform,opacity] duration-[var(--motion-base)] ease-[var(--motion-ease)]
          ${shown ? 'opacity-100 scale-100' : 'opacity-0 scale-95'} ${sizeClass}`}
      >
        {title !== undefined && (
          <div className="flex items-start justify-between px-space-5 pt-space-5 pb-space-3 border-b border-gj-line">
            <h2 id={titleId} className="text-fs-600 font-black text-color-text-primary">{title}</h2>
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
        )}
        <div className="flex-1 overflow-y-auto px-space-5 py-space-4">{children}</div>
        {footer && (
          <div className="px-space-5 py-space-4 border-t border-gj-line flex justify-end gap-space-2">
            {footer}
          </div>
        )}
        {title === undefined && (
          <button
            onClick={onClose}
            aria-label="Fermer"
            className="absolute top-space-3 right-space-3 text-gj-grey hover:text-gj-ink transition-colors
              min-h-[var(--tap-min)] min-w-[var(--tap-min)] flex items-center justify-center
              rounded-gj-pill"
          >
            ✕
          </button>
        )}
      </div>
    </div>
  )
}
