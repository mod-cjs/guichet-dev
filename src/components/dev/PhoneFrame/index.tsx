import type { ReactNode } from 'react'

export interface PhoneFrameProps {
  children: ReactNode
  /** Largeur interne (défaut 390 = iPhone 14 logical). */
  width?: number
  /** Hauteur interne (défaut 844). */
  height?: number
  /** Affiche la status bar simulée. */
  withStatusBar?: boolean
  /** Couleur fond du contenu. */
  bg?: string
  className?: string
}

/**
 * StatusBar simulée (9:41 + signal/wifi/batterie).
 * Visuels purement décoratifs — aria-hidden.
 */
function StatusBar() {
  return (
    <div
      aria-hidden
      style={{
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 22px',
        fontSize: 15,
        fontWeight: 700,
        color: 'var(--gj-ink)',
        flexShrink: 0,
        letterSpacing: '.2px',
      }}
    >
      <span>9:41</span>
      <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }}>
        <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor">
          <path d="M1 9.5h1v-7H1v7zm2 0h1v-7H3v7zm2-1h1v-6H5v6zm2 0h1v-6H7v6zm2-1h1v-5H9v5zm2 0h1v-5h-1v5zm2-1h1v-4h-1v4zm2 0h1v-4h-1v4z" />
        </svg>
        <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
          <path d="M7.5 2.5c1.9 0 3.7.7 5 2l-1 1.1c-1.1-1-2.5-1.6-4-1.6s-2.9.6-4 1.6l-1-1.1c1.3-1.3 3.1-2 5-2zm0 3c1.1 0 2 .4 2.8 1.1l-1 1c-.5-.4-1.1-.7-1.8-.7s-1.3.3-1.8.7l-1-1c.8-.7 1.7-1.1 2.8-1.1zm0 3.5l1.4-1.4c-.4-.4-.9-.6-1.4-.6s-1 .2-1.4.6L7.5 9z" />
        </svg>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
          <span style={{ fontSize: 13 }}>100</span>
          <span
            style={{
              position: 'relative',
              width: 24,
              height: 11,
              border: '1.2px solid var(--gj-ink)',
              borderRadius: 3,
              opacity: 0.55,
            }}
          >
            <span style={{ position: 'absolute', inset: 1.5, background: 'var(--gj-ink)', borderRadius: 1.5 }} />
            <span style={{ position: 'absolute', right: -3, top: 3, width: 2, height: 5, background: 'var(--gj-ink)', borderRadius: 1 }} />
          </span>
        </span>
      </span>
    </div>
  )
}

/**
 * PhoneFrame — simulateur iPhone 14 (390×844) pour les pages de preview.
 *
 * STRICTEMENT DEV — rend `null` en `NODE_ENV === 'production'`.
 * Stocké dans `src/components/dev/` pour signaler son usage hors UI prod.
 *
 * Conforme `design-guichet-v2/phone.jsx` PhoneFrame :
 * - cadre 390×844, fond blanc, fontFamily inherit
 * - bord noir épais arrondi (Dynamic Island/notch simulés via padding-top)
 * - status bar 9:41 + signal/wifi/batterie
 * - safe-area bottom 18px
 * - contenu scrollable interne
 */
export function PhoneFrame({
  children,
  width = 390,
  height = 844,
  withStatusBar = true,
  bg = 'var(--gj-bg)',
  className = '',
}: PhoneFrameProps) {
  if (process.env.NODE_ENV === 'production') return null

  return (
    <div
      data-phone-frame
      className={className}
      style={{
        width: width + 20,
        height: height + 20,
        background: '#000',
        borderRadius: 'calc(var(--gj-r-2xl, 24px) * 2)',
        padding: 10,
        boxShadow: '0 30px 60px rgba(0,0,0,.25)',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* Notch / Dynamic Island */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 18,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 110,
          height: 28,
          background: '#000',
          borderRadius: 999,
          zIndex: 2,
        }}
      />
      <div
        style={{
          width,
          height,
          background: bg,
          fontFamily: 'var(--gj-font-sans, inherit)',
          color: 'var(--color-text-primary)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          position: 'relative',
          borderRadius: 'var(--gj-r-2xl, 24px)',
        }}
      >
        {withStatusBar ? <StatusBar /> : null}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
          }}
        >
          {children}
        </div>
        <div aria-hidden style={{ height: 18, flexShrink: 0 }} />
      </div>
    </div>
  )
}
