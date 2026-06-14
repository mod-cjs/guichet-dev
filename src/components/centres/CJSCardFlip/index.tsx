'use client'

import { useState, useCallback, type KeyboardEvent } from 'react'
import { MyCJSCard, type MyCJSCardUser } from '../MyCJSCard'

export interface CJSCardFlipProps {
  user: MyCJSCardUser
  cjsUid?: string
  /** JWT rotatif (Wave 6.1). Si absent, le verso affiche le faux barcode. */
  qrToken?: string | null
  /** Expiration JWT (countdown sur QRBadge). */
  qrExpiresAt?: Date | null
  /** Largeur max en px. */
  maxWidth?: number
  className?: string
}

/**
 * <CJSCardFlip> — wrapper "flip card" autour de `<MyCJSCard>` (recto/verso).
 *
 * GUIC-386 / Wave 6.1 — flip 3D CSS pure (pas de lib).
 *
 * - Tap / clic = bascule recto ↔ verso
 * - Clavier `Enter`/`Space` supportés (button-like ARIA)
 * - `aria-pressed` reflète l'état (true = verso visible)
 * - Respecte `prefers-reduced-motion` : pas d'animation, switch instantané
 * - Backface hidden + `transform-style: preserve-3d`
 */
export function CJSCardFlip({
  user,
  cjsUid,
  qrToken = null,
  qrExpiresAt = null,
  maxWidth = 480,
  className = '',
}: CJSCardFlipProps) {
  const [isFlipped, setIsFlipped] = useState(false)

  const toggle = useCallback(() => setIsFlipped((f) => !f), [])

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLDivElement>) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        toggle()
      }
    },
    [toggle],
  )

  return (
    <div
      className={`cjs-card-flip ${className}`.trim()}
      style={{ width: '100%', maxWidth, perspective: 1200 }}
      data-testid="cjs-card-flip-root"
    >
      <style>{`
        .cjs-card-flip-inner {
          position: relative;
          width: 100%;
          transition: transform 0.6s cubic-bezier(.22,.61,.36,1);
          transform-style: preserve-3d;
        }
        .cjs-card-flip-inner.is-flipped {
          transform: rotateY(180deg);
        }
        .cjs-card-flip-face {
          backface-visibility: hidden;
          -webkit-backface-visibility: hidden;
        }
        .cjs-card-flip-face.back {
          position: absolute;
          inset: 0;
          transform: rotateY(180deg);
        }
        @media (prefers-reduced-motion: reduce) {
          .cjs-card-flip-inner { transition: none; }
        }
      `}</style>

      <div
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
        aria-label={
          isFlipped
            ? 'Voir le recto de la carte CJS'
            : 'Voir le dos de la carte CJS'
        }
        onClick={toggle}
        onKeyDown={onKeyDown}
        className={`cjs-card-flip-inner ${isFlipped ? 'is-flipped' : ''}`}
        data-testid="cjs-card-flip-inner"
        style={{
          minHeight: 220,
          cursor: 'pointer',
          borderRadius: 14,
        }}
      >
        <div className="cjs-card-flip-face front">
          <MyCJSCard
            user={user}
            cjsUid={cjsUid}
            maxWidth={maxWidth}
            variant="recto"
          />
        </div>
        <div className="cjs-card-flip-face back">
          <MyCJSCard
            user={user}
            cjsUid={cjsUid}
            maxWidth={maxWidth}
            variant="verso"
            qrToken={qrToken}
            qrExpiresAt={qrExpiresAt}
          />
        </div>
      </div>
    </div>
  )
}
