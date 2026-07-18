import type { ReactNode } from 'react'

export interface YayeBubbleProps {
  from: 'bot' | 'user'
  children: ReactNode
  /** Horaire affiché sous la bulle (optionnel, format libre). */
  timestamp?: string
  className?: string
}

/**
 * YayeBubble — bulle de chat asymétrique dans la conversation Yaye.
 *
 * - `bot` : surface white, border `--gj-line`, ink, coin bottom-left réduit
 * - `user` : background `--gj-teal-deep`, texte blanc, coin bottom-right réduit
 * - Max-width responsive (75% mobile, 60% desktop)
 * - Aligné à gauche (bot) ou à droite (user)
 *
 * Conforme `screens.jsx` #10 (YayeFullScreen).
 */
export function YayeBubble({ from, children, timestamp, className = '' }: YayeBubbleProps) {
  const isBot = from === 'bot'

  return (
    <div className={`flex flex-col gap-1 ${isBot ? 'items-start' : 'items-end'} ${className}`}>
      <div
        className={`text-fs-300 leading-snug px-space-3 py-space-2 max-w-[86%] md:max-w-[80%]
          ${isBot
            ? 'bg-white border border-gj-line text-color-text-primary'
            : 'bg-gj-teal-deep text-white'}
        `}
        style={{
          // Design v4 : coins plus arrondis (16px), pointe réduite côté émetteur.
          borderRadius: isBot ? '16px 16px 16px 4px' : '16px 16px 4px 16px',
          boxShadow: isBot ? 'none' : '0 2px 6px rgba(0,122,92,.18)',
        }}
      >
        {children}
      </div>
      {timestamp && (
        <span className="text-fs-100 text-gj-grey px-1" aria-label={`Envoyé à ${timestamp}`}>
          {timestamp}
        </span>
      )}
    </div>
  )
}
