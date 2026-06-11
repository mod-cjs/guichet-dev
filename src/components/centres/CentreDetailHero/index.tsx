'use client'

import { Icon } from '@/components/ui/Icon'
import { CentreOpenDot } from '../CentreOpenDot'
import { SenegalMap, type SenegalMapPin } from '../SenegalMap'

export interface CentreDetailHeroProps {
  centre: {
    nom: string
    region: string
    ville?: string | null
    adresse: string
    description?: string | null
    conseillersCount: number
  }
  isOpen: boolean
  /** Texte ouverture/prochaine ouverture (ex. "08:00 - 18:00"). */
  openingHoursText?: string | null
  /** Si user.centrePrincipalId === centre.id → eyebrow "Mon centre". */
  isMine?: boolean
  onItineraryClick?: () => void
  onAppointmentClick?: () => void
  /** Afficher la mini-SenegalMap (desktop only par défaut). */
  showMiniMap?: boolean
  /** Pins pour la mini-map (centre + voisins éventuels). */
  pins?: SenegalMapPin[]
  className?: string
}

/**
 * <CentreDetailHero> — bandeau teal-gradient en tête de la page `/centres/[slug]`.
 *
 * Source design : `public/design-v2/centres-web.jsx:135-204` (desktop).
 * Mobile : on cache la mini-map (`showMiniMap=false`) et on compacte.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 3.
 */
export function CentreDetailHero({
  centre,
  isOpen,
  openingHoursText,
  isMine = false,
  onItineraryClick,
  onAppointmentClick,
  showMiniMap = false,
  pins = [],
  className = '',
}: CentreDetailHeroProps) {
  const villeOrRegion = centre.ville || centre.region
  const openText = openingHoursText
    ? isOpen
      ? `Ouvert · ${openingHoursText}`
      : openingHoursText
    : isOpen
      ? 'Ouvert'
      : 'Fermé'

  return (
    <section
      role="banner"
      data-mine={isMine ? 'true' : 'false'}
      className={`relative overflow-hidden ${className}`.trim()}
      style={{
        background:
          'linear-gradient(135deg, var(--gj-teal-deep) 0%, var(--gj-ink-teal, var(--gj-teal-deep)) 100%)',
        color: 'var(--gj-surface)',
        borderRadius: 18,
        padding: '24px 26px',
        display: 'flex',
        gap: 20,
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
      }}
    >
      <span
        aria-hidden="true"
        style={{
          position: 'absolute',
          right: -50,
          top: -60,
          width: 240,
          height: 240,
          background:
            'radial-gradient(circle, rgba(249,196,0,.16), transparent 60%)',
          pointerEvents: 'none',
        }}
      />
      <div style={{ position: 'relative', flex: '1 1 280px', minWidth: 0 }}>
        {isMine && (
          <span
            data-testid="hero-eyebrow"
            style={{
              fontSize: 10.5,
              fontWeight: 800,
              color: 'var(--gj-yellow)',
              textTransform: 'uppercase',
              letterSpacing: '.5px',
            }}
          >
            Mon centre · {centre.region}
          </span>
        )}
        <h1
          className="m-0"
          style={{
            fontSize: 28,
            fontWeight: 900,
            lineHeight: 1.15,
            marginTop: isMine ? 6 : 0,
          }}
        >
          {centre.nom}
        </h1>
        <p
          className="m-0"
          style={{
            fontSize: 14,
            opacity: 0.9,
            marginTop: 6,
          }}
        >
          {centre.adresse}
        </p>

        {/* Chips */}
        <div
          className="flex flex-wrap"
          style={{ gap: 8, marginTop: 14 }}
          aria-label="Informations du centre"
        >
          <span
            data-testid="chip-open"
            className="inline-flex items-center"
            style={{
              gap: 6,
              background: 'rgba(255,255,255,.12)',
              border: '1px solid rgba(255,255,255,.2)',
              padding: '5px 11px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <CentreOpenDot open={isOpen} />
            {openText}
          </span>
          <span
            data-testid="chip-conseillers"
            className="inline-flex items-center"
            style={{
              gap: 6,
              background: 'rgba(255,255,255,.12)',
              border: '1px solid rgba(255,255,255,.2)',
              padding: '5px 11px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <Icon
              name="users"
              size={13}
              style={{ color: 'var(--gj-yellow)' }}
            />
            {centre.conseillersCount} conseillers
          </span>
          <span
            data-testid="chip-ville"
            className="inline-flex items-center"
            style={{
              gap: 6,
              background: 'rgba(255,255,255,.12)',
              border: '1px solid rgba(255,255,255,.2)',
              padding: '5px 11px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 700,
            }}
          >
            <Icon
              name="pin"
              size={13}
              style={{ color: 'var(--gj-yellow)' }}
            />
            {villeOrRegion}
          </span>
        </div>

        {/* CTAs */}
        <div
          className="flex flex-wrap"
          style={{ gap: 10, marginTop: 18 }}
        >
          <button
            type="button"
            onClick={onAppointmentClick}
            aria-label={`Prendre rendez-vous au centre ${centre.nom}`}
            className="inline-flex items-center justify-center"
            style={{
              background: 'var(--gj-yellow)',
              color: 'var(--gj-ink)',
              border: 0,
              padding: '11px 18px',
              borderRadius: 9,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              gap: 6,
              minHeight: 44,
            }}
          >
            <Icon name="calendar" size={15} />
            Prendre RDV
          </button>
          <button
            type="button"
            onClick={onItineraryClick}
            aria-label={`Itinéraire vers le centre ${centre.nom}`}
            className="inline-flex items-center justify-center"
            style={{
              background: 'rgba(255,255,255,.12)',
              color: 'var(--gj-surface)',
              border: '1.5px solid rgba(255,255,255,.25)',
              padding: '11px 18px',
              borderRadius: 9,
              fontWeight: 800,
              fontSize: 13,
              cursor: 'pointer',
              gap: 6,
              minHeight: 44,
            }}
          >
            <Icon name="pin" size={15} />
            Itinéraire
          </button>
        </div>
      </div>

      {showMiniMap && (
        <div
          data-testid="hero-minimap"
          style={{ position: 'relative', width: 150, flexShrink: 0 }}
          aria-hidden="true"
        >
          <SenegalMap pins={pins} height={150} showLabels={false} />
        </div>
      )}
    </section>
  )
}
