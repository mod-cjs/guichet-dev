'use client'
import { useEffect } from 'react'
import type { IconName } from '../Icon'
import { Icon } from '../Icon'

/** Variants v2 — `success`, `info`, `warning`, `danger`. `error` est conservé comme alias de `danger`. */
export type ToastVariant = 'info' | 'success' | 'warning' | 'danger' | 'error'
export type ToastPosition = 'bottom-right' | 'bottom-center' | 'top-right'

export interface ToastAction {
  label: string
  onClick: () => void
}

interface ToastProps {
  message: string
  detail?: string
  /** Variant sémantique. Compat ascendante : `error` reste accepté (alias `danger`). */
  variant?: ToastVariant
  /** @deprecated Utiliser `variant`. */
  type?: ToastVariant
  position?: ToastPosition
  duration?: number
  icon?: IconName
  /** Hauteur de la barre fixe sous le toast (ex: BottomNav = 72). Défaut : 0. */
  bottomOffset?: number
  onClose: () => void
  /** Callback déclenché à la fermeture (clic ou auto-dismiss). Alias optionnel. */
  onDismiss?: () => void
  /** Action inline optionnelle (ex. "Annuler") — bouton ambre sur le fond sombre. */
  action?: ToastAction
}

interface VariantStyle {
  /** Fond de la pastille portant l'icône (sémantique success/danger/info/warning). */
  dot: string
  /** Couleur de l'icône dans la pastille (contraste AA — noir sur ambre, blanc ailleurs). */
  dotFg: string
  label: string
  defaultIcon: IconName
}

const VARIANTS: Record<Exclude<ToastVariant, 'error'>, VariantStyle> = {
  info:    { dot: 'bg-gj-blue',   dotFg: 'text-white',  label: 'Information', defaultIcon: 'info' },
  success: { dot: 'bg-gj-green',  dotFg: 'text-white',  label: 'Succès',      defaultIcon: 'check-circle' },
  warning: { dot: 'bg-gj-yellow', dotFg: 'text-gj-ink', label: 'Attention',   defaultIcon: 'alert' },
  danger:  { dot: 'bg-gj-red',    dotFg: 'text-white',  label: 'Erreur',      defaultIcon: 'alert' },
}

const POSITIONS: Record<ToastPosition, string> = {
  'bottom-right':  'right-space-3 md:right-space-5',
  'bottom-center': 'left-1/2 -translate-x-1/2',
  'top-right':     'right-space-3 md:right-space-5',
}

/**
 * Toast — notification éphémère du design system v5 (Lot 14).
 *
 * - Fond sombre unique (`var(--gj-ink)`, texte blanc) quel que soit le
 *   variant — la sémantique (`info`/`success`/`warning`/`danger`) est
 *   portée uniquement par la pastille colorée autour de l'icône.
 *   `error` reste accepté comme alias de `danger` (compat ascendante).
 * - Slot d'action inline optionnel (`action`) — bouton ambre, ex. « Annuler ».
 * - 3 positions (`bottom-right`, `bottom-center`, `top-right`).
 * - ARIA `role="status"` (`aria-live="assertive"` pour `danger`/`warning`,
 *   `polite` sinon).
 * - Auto-dismiss configurable, callback `onClose` (+ `onDismiss` alias).
 */
export function Toast({
  message,
  detail,
  variant,
  type,
  position = 'bottom-center',
  duration = 4000,
  icon,
  bottomOffset = 0,
  onClose,
  onDismiss,
  action,
}: ToastProps) {
  const resolved: Exclude<ToastVariant, 'error'> =
    (variant ?? type ?? 'success') === 'error' ? 'danger' : ((variant ?? type ?? 'success') as Exclude<ToastVariant, 'error'>)

  const v = VARIANTS[resolved]
  const isUrgent = resolved === 'danger' || resolved === 'warning'
  const iconName = icon ?? v.defaultIcon

  useEffect(() => {
    if (duration <= 0) return
    const t = setTimeout(() => {
      onClose()
      onDismiss?.()
    }, duration)
    return () => clearTimeout(t)
  }, [onClose, onDismiss, duration])

  const handleDismiss = () => {
    onClose()
    onDismiss?.()
  }

  const isTop = position === 'top-right'
  const vertical = isTop
    ? { top: `calc(var(--safe-top) + var(--space-3))` }
    : {
        bottom: bottomOffset
          ? `calc(${bottomOffset}px + var(--safe-bottom) + var(--space-3))`
          : `calc(var(--safe-bottom) + var(--space-3))`,
      }

  return (
    <div
      role="status"
      aria-live={isUrgent ? 'assertive' : 'polite'}
      className={`fixed left-space-3 md:left-auto ${POSITIONS[position]}
        flex items-center gap-2.5 bg-gj-ink text-white
        rounded-[11px] py-space-3 px-space-4 shadow-gj-md max-w-[420px]`}
      style={{
        ...vertical,
        zIndex: 'var(--gj-z-toast)',
      }}
    >
      <span
        className={`w-6 h-6 rounded-full ${v.dot} ${v.dotFg} flex items-center justify-center flex-shrink-0`}
        aria-label={v.label}
        role="img"
      >
        <Icon name={iconName} size={13} />
      </span>
      <div className="flex-1 text-fs-300 leading-snug min-w-0">
        <strong className="block font-bold">{message}</strong>
        {detail && <span className="block opacity-90">{detail}</span>}
      </div>
      {action ? (
        <button
          onClick={action.onClick}
          className="text-gj-yellow font-bold text-fs-300 whitespace-nowrap
            flex-shrink-0 min-h-[var(--tap-min)] px-1 flex items-center"
        >
          {action.label}
        </button>
      ) : null}
      <button
        onClick={handleDismiss}
        aria-label="Fermer"
        className="opacity-70 hover:opacity-100 transition-opacity
          min-h-[var(--tap-min)] min-w-[var(--tap-min)] flex items-center justify-center -m-2 flex-shrink-0"
      >
        <Icon name="close" size={16} />
      </button>
    </div>
  )
}
