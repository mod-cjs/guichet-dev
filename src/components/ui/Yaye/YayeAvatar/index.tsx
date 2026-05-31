import type { CSSProperties } from 'react'

export type YayeAvatarSize = 24 | 32 | 48 | 64

export interface YayeAvatarProps {
  /** Taille en pixels. Défaut 32. */
  size?: YayeAvatarSize
  /** Affiche le badge "IA" jaune en haut à droite. */
  withBadge?: boolean
  className?: string
  style?: CSSProperties
}

/**
 * YayeAvatar — avatar circulaire signature de l'assistant IA Yaye.
 *
 * Cercle au gradient teal/green (`var(--gj-yaye-gradient)`) contenant la
 * lettre "Y" blanche. Badge "IA" optionnel en haut à droite (jaune).
 * Conforme à l'identité visuelle du design v2 (`screens.jsx` #10).
 */
export function YayeAvatar({ size = 32, withBadge = false, className = '', style }: YayeAvatarProps) {
  const fontSize = Math.round(size * 0.55)
  const badgeFs = Math.max(8, Math.round(size * 0.28))

  return (
    <span
      role="img"
      aria-label="Assistant IA"
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundImage: 'var(--gj-yaye-gradient)',
        color: 'var(--gj-surface)',
        fontWeight: 900,
        fontSize,
        lineHeight: 1,
        boxShadow: '0 0 0 2px rgba(255,255,255,.25)',
        flexShrink: 0,
        ...style,
      }}
    >
      Y
      {withBadge && (
        <span
          aria-label="Assistant IA"
          className="absolute"
          style={{
            top: -2,
            right: -4,
            background: 'var(--gj-yellow)',
            color: 'var(--gj-teal-deep)',
            fontSize: badgeFs,
            fontWeight: 900,
            padding: '2px 5px',
            borderRadius: 999,
            letterSpacing: '.3px',
            boxShadow: '0 0 0 2px var(--gj-bg)',
            lineHeight: 1,
          }}
        >
          IA
        </span>
      )}
    </span>
  )
}
