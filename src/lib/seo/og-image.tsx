/**
 * Image OpenGraph/Twitter par défaut (GUIC-25 / M7 SEO) — 1200×630, brandée CJS.
 *
 * Générée dynamiquement via `next/og` (ImageResponse) : pas d'asset binaire à
 * maintenir. Police système par défaut (aucune ressource externe → compatible
 * runtime sans fetch réseau). Réutilisée par `app/opengraph-image` et
 * `app/twitter-image`.
 */
import { ImageResponse } from 'next/og'

export const OG_IMAGE_SIZE = { width: 1200, height: 630 }
export const OG_IMAGE_ALT = 'Guichet Jeunesse — Consortium Jeunesse Sénégal'
export const OG_IMAGE_CONTENT_TYPE = 'image/png'

// Couleurs de marque (littérales — contexte hors composant UI, cf. tokens.css).
const TEAL = '#009F76'
const TEAL_DEEP = '#007A5C'
const TEAL_INK = '#0A2820'

export function renderOgImage(): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '80px',
          background: `linear-gradient(135deg, ${TEAL_INK} 0%, ${TEAL_DEEP} 55%, ${TEAL} 100%)`,
          color: '#ffffff',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: 2,
            textTransform: 'uppercase',
            color: '#E1F5EE',
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: '#F2C200',
              display: 'flex',
            }}
          />
          Consortium Jeunesse Sénégal
        </div>

        <div style={{ marginTop: 40, fontSize: 92, fontWeight: 800, lineHeight: 1.05 }}>
          Guichet Jeunesse
        </div>

        <div style={{ marginTop: 28, fontSize: 34, color: '#E1F5EE', maxWidth: 900 }}>
          Opportunités, formations, événements et ressources pour les jeunes du Sénégal.
        </div>

        <div style={{ marginTop: 'auto', fontSize: 26, color: '#B9E6D6' }}>
          guichetjeunesse.sn
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  )
}
