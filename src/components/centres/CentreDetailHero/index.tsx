'use client'

import { Icon } from '@/components/ui/Icon'
import { CentreOpenDot } from '../CentreOpenDot'
import {
  CentresMapGoogle,
  type CentresMapGoogleCentre,
  type CentresMapGoogleListItem,
} from '../CentresMapGoogle'

export interface CentreDetailHeroProps {
  centre: {
    id: string
    slug: string
    nom: string
    region: string
    ville?: string | null
    adresse: string
    description?: string | null
    conseillersCount: number
    latitude: number
    longitude: number
  }
  isOpen: boolean
  /** Texte ouverture/prochaine ouverture (ex. "08:00 - 18:00"). */
  openingHoursText?: string | null
  /** Si user.centrePrincipalId === centre.id → eyebrow "Mon centre". */
  isMine?: boolean
  onItineraryClick?: () => void
  onAppointmentClick?: () => void
  className?: string
}

/**
 * <CentreDetailHero> — bandeau teal-gradient en tête de la page `/centres/[slug]`.
 *
 * Rendu unique responsive : mini-carte Google Maps zoomée sur le centre +
 * pin rouge pulsé, masquée sur mobile via classes Tailwind (gain place).
 *
 * Source design : `public/design-v2/centres-web.jsx:135-204` (desktop hero).
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

  // Mini-carte Google Maps focalisée sur le centre courant (vue détail).
  const mapCentres: CentresMapGoogleCentre[] = [
    {
      id: centre.id,
      nom: centre.nom,
      latitude: centre.latitude,
      longitude: centre.longitude,
    },
  ]
  const mapList: CentresMapGoogleListItem[] = [
    {
      id: centre.id,
      nom: centre.nom,
      region: centre.region,
      slug: centre.slug,
    },
  ]

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
          style={{ fontSize: 14, opacity: 0.9, marginTop: 6 }}
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
        <div className="flex flex-wrap" style={{ gap: 10, marginTop: 18 }}>
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

      {/* Mini-carte Google Maps : centrée sur le centre courant, zoom rue,
          pin rouge pulsé. Masquée sur mobile (gain place) via Tailwind. */}
      <div
        data-testid="hero-minimap"
        className="hidden lg:block"
        style={{
          position: 'relative',
          width: 220,
          flexShrink: 0,
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <CentresMapGoogle
          centres={mapCentres}
          centresForList={mapList}
          activeId={centre.id}
          zoom={14}
          height={180}
          disableUI
          pulseActiveMarker
        />
      </div>
    </section>
  )
}
