import { appDomain } from '@/lib/app-url'

export interface MyCJSCardBackProps {
  matricule: string
  /** Date d'émission lisible (ex: "03/2025"). */
  emiseLe?: string
  maxWidth?: number
  className?: string
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
  emiseLe = '03/2025',
  maxWidth = 480,
  className = '',
}: MyCJSCardBackProps) {
  const heights = makeBarcodeHeights(40)

  return (
    <article
      aria-label="Verso carte CJS"
      className={`relative overflow-hidden rounded-gj-2xl text-white flex flex-col gap-3 ${className}`.trim()}
      style={{
        maxWidth,
        padding: 22,
        background: 'var(--gj-ink)',
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
        <div className="font-bold mb-1" style={{ color: '#fff' }}>
          Conditions
        </div>
        <p style={{ margin: 0 }}>
          Cette carte est strictement personnelle. La présentation du QR à un
          centre CJS vaut consentement au check-in. Toute utilisation
          frauduleuse entraîne la révocation immédiate de l&apos;adhésion.
        </p>
      </section>

      <div
        aria-hidden="true"
        data-testid="cjs-card-back-barcode"
        className="flex items-end gap-[2px] mt-1"
        style={{ height: 40 }}
      >
        {heights.map((h, i) => (
          <span
            key={i}
            style={{
              display: 'inline-block',
              width: 3,
              height: h,
              background: i % 3 === 0 ? 'var(--gj-yellow)' : '#fff',
              opacity: i % 5 === 0 ? 0.6 : 1,
            }}
          />
        ))}
      </div>

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
