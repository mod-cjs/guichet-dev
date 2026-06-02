import { Icon } from '@/components/ui'
import type { MockCentre } from './mock-data'

export interface CentresMapProps {
  centres: MockCentre[]
  /** Identifiant du centre mis en évidence (rouge avec label). Par défaut le primary. */
  highlightId?: string
  onRecenter?: () => void
}

/**
 * CentresMap — visuel statique (SVG + divs) représentant les centres sur une "carte".
 *
 * Pas de Leaflet/Mapbox/Google Maps (MVP — cf. garde-fous GUIC-193).
 * Les positions sont calculées en pourcentage à partir de l'index dans la liste
 * pour rester déterministes (pas de géo réelle ici).
 */
export function CentresMap({ centres, highlightId, onRecenter }: CentresMapProps) {
  const highlight = highlightId ?? centres.find((c) => c.isPrimary)?.id

  // Distribution déterministe — 4 emplacements maxi visibles sur le mock.
  const positions: Array<{ x: string; y: string }> = [
    { x: '70%', y: '50%' },
    { x: '42%', y: '30%' },
    { x: '24%', y: '55%' },
    { x: '82%', y: '78%' },
  ]

  return (
    <div
      role="img"
      aria-label="Carte indicative des centres CJS (visuel statique MVP)"
      className="relative overflow-hidden rounded-gj-lg"
      style={{
        height: 180,
        border: '1.5px solid var(--gj-line)',
        background:
          'linear-gradient(135deg, #E5F0EC 0%, #D6E5E0 50%, #C5DDD8 100%)',
      }}
    >
      {/* Grid */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,122,92,.08) 1px, transparent 1px), linear-gradient(90deg, rgba(0,122,92,.08) 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      />
      {/* Routes décoratives */}
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          left: 60,
          top: 130,
          width: 180,
          height: 3,
          background: 'var(--gj-yellow)',
          boxShadow: '0 0 0 4px rgba(249,196,0,.25)',
          transform: 'rotate(-18deg)',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute rounded-full"
        style={{
          left: 200,
          top: 90,
          width: 80,
          height: 3,
          background: 'var(--gj-yellow)',
          boxShadow: '0 0 0 4px rgba(249,196,0,.25)',
          transform: 'rotate(28deg)',
        }}
      />

      {/* User pin */}
      <div
        aria-hidden="true"
        className="absolute"
        style={{ left: '28%', top: '85%', width: 26, height: 26, transform: 'translate(-50%, -100%)' }}
      >
        <div
          className="w-full h-full rounded-full bg-white flex items-center justify-center"
          style={{ border: '2.5px solid var(--gj-teal-deep)', boxShadow: '0 4px 10px rgba(0,0,0,.2)' }}
        >
          <span
            className="rounded-full"
            style={{ width: 10, height: 10, background: 'var(--gj-teal-deep)' }}
          />
        </div>
      </div>

      {/* Centres pins */}
      {centres.slice(0, positions.length).map((c, i) => {
        const pos = positions[i]
        const isHighlight = c.id === highlight
        const size = isHighlight ? 36 : 26
        return (
          <div
            key={c.id}
            className="absolute"
            data-testid={`map-pin-${c.id}`}
            style={{
              left: pos.x,
              top: pos.y,
              width: size,
              height: size,
              transform: 'translate(-50%, -100%)',
            }}
            aria-label={c.nom}
          >
            <svg viewBox="0 0 24 30" width="100%" height="100%">
              <path
                d="M12 0C5.4 0 0 5 0 11c0 8 12 19 12 19s12-11 12-19c0-6-5.4-11-12-11z"
                fill={isHighlight ? 'var(--gj-red)' : 'var(--gj-teal-deep)'}
              />
              <circle cx="12" cy="11" r={isHighlight ? 5 : 4} fill="#fff" />
              {isHighlight && <circle cx="12" cy="11" r="2.4" fill="var(--gj-red)" />}
            </svg>
          </div>
        )
      })}

      {/* Label bubble du centre highlight */}
      {highlight && (() => {
        const c = centres.find((x) => x.id === highlight)
        if (!c) return null
        const distLabel =
          c.distanceKm < 10 ? `${c.distanceKm.toFixed(1)} km` : `${Math.round(c.distanceKm)} km`
        return (
          <div
            className="absolute bg-white rounded-gj-md text-fs-200 font-bold text-color-text-primary whitespace-nowrap"
            style={{
              left: '70%',
              top: '30%',
              transform: 'translate(-50%, -160%)',
              border: '1.5px solid var(--gj-line)',
              padding: '5px 10px',
              boxShadow: '0 4px 12px rgba(0,0,0,.1)',
            }}
          >
            {c.nom} · {distLabel}
          </div>
        )
      })()}

      {/* Recenter button */}
      <button
        type="button"
        onClick={onRecenter}
        aria-label="Recentrer la carte"
        className="absolute bg-white inline-flex items-center justify-center cursor-pointer"
        style={{
          right: 10,
          bottom: 10,
          width: 38,
          height: 38,
          borderRadius: 10,
          border: '1.5px solid var(--gj-line)',
          boxShadow: '0 4px 10px rgba(0,0,0,.08)',
          color: 'var(--gj-teal-deep)',
        }}
      >
        <Icon name="target" size={18} />
      </button>
    </div>
  )
}
