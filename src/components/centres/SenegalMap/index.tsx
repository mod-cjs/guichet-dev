'use client'

import { useId } from 'react'

/**
 * Chemin SVG approximatif du Sénégal en viewBox 270×205.
 *
 * Source design de référence : `public/design-v2/centres-data.jsx` (variable
 * `SENEGAL_PATH`). Ce fichier source n'étant pas livré dans le worktree
 * Path SVG simplifié du Sénégal (viewBox 270×205) copié depuis le design source
 * `public/design-v2/centres-data.jsx` (livré GUIC-351 PR #114). Inclut l'entaille
 * Gambie + presqu'île Cap-Vert + Casamance.
 */
const SENEGAL_PATH =
  'M44,28 L78,18 L120,16 L150,24 L175,40 L188,62 L200,82 L224,92 L236,120 L242,150 L240,176 L252,182 L250,192 L210,190 L170,184 L150,190 L120,192 L90,190 L60,186 L44,190 L40,168 L42,150 L42,140 L150,142 L166,138 L150,126 L44,124 L40,112 L36,96 L10,84 L34,72 L36,52 Z'

export interface SenegalMapPin {
  id: string
  /** Coordonnée x dans le viewBox 270×205. */
  x: number
  /** Coordonnée y dans le viewBox 270×205. */
  y: number
  label: string
  active?: boolean
}

export interface SenegalMapProps {
  pins: SenegalMapPin[]
  /** Identifiant du pin actif (override des `active` individuels). */
  activeId?: string
  onPinClick?: (id: string) => void
  /** Afficher le label du pin actif au-dessus de celui-ci. */
  showLabels?: boolean
  /** Hauteur de rendu (px). Largeur = `auto`, ratio viewBox conservé. */
  height?: number
  className?: string
}

/**
 * <SenegalMap> — carte SVG statique du Sénégal pour la vue `detail` ou la
 * mini-map. La vue `all` desktop/mobile utilise `<CentresMapGoogle>` (cf.
 * ADR-004).
 *
 * A11y :
 * - `role="img"` + `<title>` global
 * - pins cliquables : `tabIndex=0`, `aria-label`, support clavier (Enter/Space)
 * - animation halo désactivée via `@media (prefers-reduced-motion: reduce)`
 */
export function SenegalMap({
  pins,
  activeId,
  onPinClick,
  showLabels = false,
  height = 320,
  className = '',
}: SenegalMapProps) {
  const titleId = useId()
  const styleId = useId()
  const animationName = `gj-senegal-pulse-${styleId.replace(/[:]/g, '')}`

  const computedActive = (p: SenegalMapPin) =>
    activeId ? p.id === activeId : Boolean(p.active)

  return (
    <div className={`relative ${className}`.trim()} style={{ height }}>
      <style>{`
        @keyframes ${animationName} {
          0% { transform: scale(1); opacity: 0.55; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .gj-senegal-halo {
          transform-origin: center;
          transform-box: fill-box;
          animation: ${animationName} 1.8s ease-out infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .gj-senegal-halo { animation: none; }
        }
      `}</style>
      <svg
        viewBox="0 0 270 205"
        width="100%"
        height="100%"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-labelledby={titleId}
      >
        <title id={titleId}>Carte des centres CJS au Sénégal</title>
        <path
          d={SENEGAL_PATH}
          fill="var(--gj-teal-soft, #E5F0EC)"
          stroke="var(--gj-teal-deep, #0A2A24)"
          strokeWidth={1}
          strokeLinejoin="round"
        />

        {pins.map((p) => {
          const active = computedActive(p)
          const interactive = Boolean(onPinClick)
          const ariaLabel = `Centre ${p.label}`

          const handleClick = () => {
            if (interactive) onPinClick!(p.id)
          }

          const handleKeyDown = (e: React.KeyboardEvent<SVGGElement>) => {
            if (!interactive) return
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              onPinClick!(p.id)
            }
          }

          return (
            <g
              key={p.id}
              data-pin-id={p.id}
              data-active={active ? 'true' : 'false'}
              aria-current={active ? 'true' : undefined}
              tabIndex={interactive ? 0 : -1}
              role={interactive ? 'button' : undefined}
              aria-label={ariaLabel}
              onClick={interactive ? handleClick : undefined}
              onKeyDown={interactive ? handleKeyDown : undefined}
              style={{ cursor: interactive ? 'pointer' : 'default', outline: 'none' }}
            >
              {active && (
                <circle
                  className="gj-senegal-halo"
                  cx={p.x}
                  cy={p.y}
                  r={6}
                  fill="var(--gj-red, #D7263D)"
                  opacity={0.55}
                />
              )}
              <circle
                cx={p.x}
                cy={p.y}
                r={4}
                fill={active ? 'var(--gj-red, #D7263D)' : 'var(--gj-teal-deep, #0A2A24)'}
                stroke="#fff"
                strokeWidth={1.2}
              />
              {showLabels && active && (
                <text
                  x={p.x}
                  y={p.y - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fontWeight={700}
                  fill="var(--gj-ink, #0E1A1F)"
                  style={{ pointerEvents: 'none' }}
                >
                  {p.label}
                </text>
              )}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
