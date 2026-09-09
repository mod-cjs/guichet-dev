import { appDomain, appUrl } from '@/lib/app-url'
import { QRBadge } from '../QRBadge'

export interface MyCJSCardBackProps {
  matricule: string | null
  /** Date d'émission lisible (ex: "03/2025"). */
  emiseLe?: string | null
  maxWidth?: number
  className?: string
  /**
   * GUIC-386 — JWT rotatif (Wave 6.1) à encoder dans le QR. Si absent,
   * le verso affiche le faux barcode décoratif initial (mode Wave 1).
   */
  qrToken?: string | null
  /** Expiration du token (utilisée pour le countdown). */
  qrExpiresAt?: Date | null
}

/**
 * Génère 40 barres de hauteurs variables pour le faux barcode décoratif.
 * Pattern déterministe basé sur l'index pour un rendu stable SSR/client.
 */
function makeBarcodeHeights(count = 40): number[] {
  const out: number[] = []
  for (let i = 0; i < count; i++) {
    // Pseudo-random déterministe
    const seed = (i * 9301 + 49297) % 233280
    const norm = seed / 233280
    out.push(16 + Math.round(norm * 24)) // hauteur entre 16 et 40
  }
  return out
}

/**
 * <MyCJSCardBack> — verso de la carte CJS.
 *
 * Refonte du verso initialement présent dans `public/design-v2/cjs-card.jsx`
 * (lignes 178-214 selon brief Wave 1). Fond ink dark, label "VERSO · CARTE
 * CJS", matricule monospace, conditions, barcode décoratif 40 barres, footer
 * d'émission.
 */
export function MyCJSCardBack({
  matricule,
  emiseLe = null,
  maxWidth = 480,
  className = '',
  qrToken = null,
  qrExpiresAt = null,
}: MyCJSCardBackProps) {
  const heights = makeBarcodeHeights(40)
  const qrUrl = qrToken ? `${appUrl()}/checkin/v1/${qrToken}` : null

  return (
    <article
      aria-label="Verso carte CJS"
      className={`relative overflow-hidden rounded-gj-2xl text-white flex flex-col gap-3 ${className}`.trim()}
      style={{
        maxWidth,
        padding: 22,
        // GUIC-397 — gradient design source (`public/design-v2/cjs-card.jsx:181`).
        // `#1a2a26` est une couleur dérivée de `--gj-ink` (vert profond) pour
        // créer un fondu sombre subtil ; conservée en hex car non tokenisée.
        background: 'linear-gradient(180deg, var(--gj-ink) 0%, #1a2a26 100%)',
        borderRadius: 18,
      }}
    >
      <header
        className="text-fs-100 font-black uppercase tracking-wide"
        style={{ color: 'var(--gj-yellow)', letterSpacing: '0.15em' }}
      >
        VERSO · CARTE CJS
      </header>

      <div className="flex flex-col gap-1">
        <span className="text-fs-100 uppercase" style={{ color: 'rgba(255,255,255,.55)' }}>
          Matricule
        </span>
        <span
          className="text-fs-400 font-black"
          style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', letterSpacing: '0.05em' }}
        >
          {matricule}
        </span>
      </div>

      <section
        aria-label="Conditions"
        className="text-fs-100"
        style={{ color: 'rgba(255,255,255,.7)', lineHeight: 1.5 }}
      >
        <div className="font-bold mb-1" style={{ color: 'var(--gj-surface)' }}>
          Conditions
        </div>
        <p style={{ margin: 0 }}>
          Carte nominative · non transmissible. La présentation du QR à un
          centre CJS vaut consentement au check-in. Toute utilisation
          frauduleuse entraîne la révocation immédiate de l&apos;adhésion.
        </p>
      </section>

      {qrUrl ? (
        <div
          data-testid="cjs-card-back-qr"
          className="flex justify-center"
          style={{
            background: 'var(--gj-surface)',
            padding: 10,
            borderRadius: 10,
            margin: '4px auto 0',
          }}
        >
          <QRBadge
            url={qrUrl}
            size={140}
            expiresAt={qrExpiresAt ?? undefined}
            showCountdown={Boolean(qrExpiresAt)}
          />
        </div>
      ) : (
        <div
          aria-hidden="true"
          data-testid="cjs-card-back-barcode"
          className="flex items-end gap-[2px] mt-1"
          style={{ height: 40 }}
        >
          {heights.map((h, i) => {
            // GUIC-397 — largeur variable conforme design source
            // (`cjs-card.jsx:189`) : alternance 3 / 2 / 1 px.
            // Couleur uniforme blanc (`--gj-surface`), pas d'alternance yellow.
            const w = i % 3 === 0 ? 3 : i % 5 === 0 ? 2 : 1
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  width: w,
                  height: h,
                  background: 'var(--gj-surface)',
                }}
              />
            )
          })}
        </div>
      )}

      <footer
        className="flex items-center justify-between text-fs-100"
        style={{
          paddingTop: 10,
          borderTop: '1px solid rgba(255,255,255,.14)',
          color: 'rgba(255,255,255,.7)',
        }}
      >
        <span>Émise le {emiseLe}</span>
        <span>{appDomain()}</span>
      </footer>
    </article>
  )
}
