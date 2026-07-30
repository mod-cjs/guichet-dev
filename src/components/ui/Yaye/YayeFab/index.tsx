'use client'
import type { ButtonHTMLAttributes } from 'react'

export interface YayeFabProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  /**
   * Position depuis le bas (en px). Par défaut, le dégagement est piloté par
   * le token `--gj-fab-offset` (globals.css) : 24px sur une page nue, remonté
   * automatiquement au-dessus d'une BottomNav ou d'une barre d'action épinglée
   * (`data-fab-clearance`) — règle du handoff v5 (GUIC-689).
   */
  bottom?: number
  /** Position depuis la droite (en px). Défaut 16. */
  right?: number
  /** Label accessible. Défaut "Parler à Yaye". */
  'aria-label'?: string
}

/**
 * YayeFab — bouton flottant d'accès à l'assistant IA Yaye.
 *
 * Design v4 (yaye-web.jsx §FAB) :
 * - 56×56, fond **dégradé Yaye** (`--gj-yaye-gradient`), lettre « Y » en Georgia serif
 * - Halo pulse `gj-pulse-yaye` (jaune)
 * - Positionné `fixed` bas-droite, z-index `--gj-z-chat`
 * - Respecte la safe-area bottom iOS
 */
export function YayeFab({
  bottom,
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
        focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[var(--focus-ring-soft)] ${className}`}
      style={{
        width: 56,
        height: 56,
        right,
        bottom:
          typeof bottom === 'number'
            ? `calc(${bottom}px + var(--safe-bottom))`
            : 'calc(var(--gj-fab-offset, 24px) + var(--safe-bottom))',
        backgroundImage: 'var(--gj-yaye-gradient)',
        color: 'var(--gj-surface)',
        border: 0,
        cursor: 'pointer',
        boxShadow: '0 8px 22px rgba(10,128,127,.4)',
        fontFamily: 'Georgia, "Times New Roman", serif',
        fontWeight: 900,
        fontSize: 26,
        lineHeight: 1,
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
      <span aria-hidden="true">Y</span>
    </button>
  )
}
