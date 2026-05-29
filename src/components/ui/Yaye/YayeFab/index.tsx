'use client'
import type { ButtonHTMLAttributes } from 'react'
import { YayeAvatar } from '../YayeAvatar'

export interface YayeFabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /** Position depuis le bas (en px). Défaut 76 pour laisser place à BottomNav. */
  bottom?: number
  /** Position depuis la droite (en px). Défaut 16. */
  right?: number
  /** Label accessible. Défaut "Parler à Yaye". */
  'aria-label'?: string
}

/**
 * YayeFab — bouton flottant d'accès à l'assistant IA Yaye.
 *
 * Conforme `phone.jsx`/`mobile-flows.jsx` du design v2 :
 * - 58×58, fond `--gj-teal-deep`, halo pulse `gj-pulse-yaye`
 * - Contient un YayeAvatar (size 32, withBadge)
 * - Positionné `fixed` bas-droite, z-index `--gj-z-chat`
 * - Respecte la safe-area bottom iOS
 */
export function YayeFab({
  bottom = 76,
  right = 16,
  'aria-label': ariaLabel = 'Parler à Yaye',
  className = '',
  style,
  ...rest
}: YayeFabProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      className={`fixed flex items-center justify-center rounded-full
        focus-visible:outline-none ${className}`}
      style={{
        width: 58,
        height: 58,
        right,
        bottom: `calc(${bottom}px + var(--safe-bottom))`,
        background: 'var(--gj-teal-deep)',
        color: 'var(--gj-surface)',
        border: 0,
        cursor: 'pointer',
        boxShadow: '0 8px 24px rgba(7,77,57,.45)',
        zIndex: 'var(--gj-z-chat)' as unknown as number,
        ...style,
      }}
      {...rest}
    >
      <span
        aria-hidden="true"
        className="absolute pointer-events-none rounded-full"
        style={{
          inset: -4,
          border: '2px solid var(--gj-yellow)',
          opacity: 0,
          animation: 'gj-pulse-yaye 2.5s ease-out infinite',
        }}
      />
      <YayeAvatar size={32} withBadge />
    </button>
  )
}
