'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import {
  CentreDetailHero,
  CentreHoursTable,
  CentreServicesGrid,
  CentreContactCard,
  RessourceCardTeaser,
  CentreDescriptionSection,
  CentreEquipeSection,
  CentreEvenementsSection,
} from '@/components/centres'
import type { CentreDetail } from '@/lib/loaders/centres'

export interface CentreDetailClientProps {
  /**
   * GUIC-706 — l'agenda est-il masqué pour ce visiteur ? Décidé côté serveur : la fiche
   * centre est une surface d'incidence, elle annonce les événements du centre depuis la
   * page d'un autre module.
   */
  agendaMasque?: boolean
  centre: CentreDetail
  userCentrePrincipalId?: string | null
  userIsConnected: boolean
}

function track(type: string, metadata: Record<string, unknown>) {
  try {
    void fetch('/api/v1/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, metadata }),
      keepalive: true,
    })
  } catch {
    // silencieux
  }
}

function buildItineraryHref(centre: CentreDetail): string {
  // Deeplink Google Maps standard (web + mobile)
  const q = `${centre.latitude},${centre.longitude}`
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`
}

/**
 * <CentreDetailClient> — orchestrateur client de `/centres/[slug]` (Wave 3).
 *
 * Layout adaptatif :
 *  - Desktop ≥ lg : grid 2 cols (1fr 320px) — corps gauche, aside droite.
 *  - Mobile < lg  : empilement vertical (hero → services → ressources →
 *    horaires → contact) + footer sticky CTAs.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 3.
 */
export function CentreDetailClient({
  agendaMasque = false,
  centre,
  userCentrePrincipalId,
  userIsConnected: _userIsConnected,
}: CentreDetailClientProps) {
  const isMine = Boolean(
    userCentrePrincipalId && userCentrePrincipalId === centre.id,
  )

  // Tracking centre_viewed au mount (source = referer-aware côté loader,
  // ici on log 'direct' fallback).
  useEffect(() => {
    track('centre_viewed', {
      centreId: centre.id,
      source:
        typeof document !== 'undefined' &&
        document.referrer.includes('/centres') &&
        !document.referrer.endsWith('/centres')
          ? 'list'
          : 'direct',
    })
  }, [centre.id])

  const handleItineraryClick = () => {
    track('centre_itinerary_opened', { centreId: centre.id })
  }
  const handleAppointmentClick = () => {
    track('centre_appointment_started', { centreId: centre.id })
  }
  const handlePhoneClick = () => {
    track('centre_phone_clicked', { centreId: centre.id })
  }
  const handleEmailClick = () => {
    track('centre_email_clicked', { centreId: centre.id })
  }
  const handleReserveClick = (ressourceId: string) => {
    track('centre_reservation_started', {
      centreId: centre.id,
      ressourceId,
    })
  }

  const itineraryHref = buildItineraryHref(centre)

  return (
    <div className="bg-gj-bg min-h-[100dvh] pb-[calc(80px+env(safe-area-inset-bottom,0px))] lg:pb-space-6">
      <div className="mx-auto max-w-screen-xl px-space-4 pt-space-4">
        <Link
          href="/centres"
          className="inline-flex items-center"
          style={{
            gap: 6,
            fontSize: 13,
            fontWeight: 800,
            color: 'var(--gj-teal-deep)',
            textDecoration: 'none',
            marginBottom: 14,
            minHeight: 44,
          }}
        >
          <Icon name="chevron-left" size={16} />
          Tous les centres
        </Link>

        {/* Hero unique responsive : la mini-carte Google Maps est rendue
            par <CentreDetailHero> et masquée mobile en interne (hidden lg:block).
            La mini-SenegalMap SVG du W3 initial a été remplacée par une vraie
            mini-Google Maps avec pin rouge pulsé sur le centre courant. */}
        <CentreDetailHero
          centre={{
            id: centre.id,
            slug: centre.slug,
            nom: centre.nom,
            region: centre.region,
            ville: centre.ville,
            adresse: centre.adresse,
            description: centre.description,
            conseillersCount: centre.conseillersCount,
            latitude: centre.latitude,
            longitude: centre.longitude,
          }}
          isOpen={centre.isOpen}
          openingHoursText={centre.openingHoursText}
          isMine={isMine}
          onItineraryClick={() => {
            handleItineraryClick()
            if (typeof window !== 'undefined') {
              window.open(itineraryHref, '_blank', 'noopener,noreferrer')
            }
          }}
          onAppointmentClick={() => {
            handleAppointmentClick()
            if (typeof window !== 'undefined') {
              window.location.href = `/centres/${centre.slug}/ressources`
            }
          }}
        />

        {/* ──────── DESKTOP grid 2 cols ──────── */}
        <div
          className="hidden lg:grid mt-space-4"
          style={{ gridTemplateColumns: '1fr 320px', gap: 22 }}
        >
          <div className="flex flex-col" style={{ gap: 20 }}>
            <CentreDescriptionSection description={centre.description} />
            <section aria-label="Ressources réservables">
              <div className="flex items-baseline justify-between" style={{ marginBottom: 12 }}>
                <h2
                  className="m-0"
                  style={{
                    fontSize: 18,
                    fontWeight: 900,
                    color: 'var(--gj-ink)',
                  }}
                >
                  Ressources réservables
                </h2>
                <Link
                  href={`/centres/${centre.slug}/ressources`}
                  style={{
                    fontSize: 12.5,
                    color: 'var(--gj-teal-deep)',
                    fontWeight: 800,
                    textDecoration: 'none',
                  }}
                >
                  Tout voir →
                </Link>
              </div>
              {centre.ressources.length === 0 ? (
                <p
                  className="m-0"
                  style={{
                    fontSize: 13,
                    color: 'var(--gj-grey)',
                    fontStyle: 'italic',
                  }}
                >
                  Aucune ressource réservable pour l’instant.
                </p>
              ) : (
                <ul
                  className="flex flex-col m-0 p-0 list-none"
                  style={{ gap: 11 }}
                  aria-label="Liste des ressources"
                >
                  {centre.ressources.map((r) => (
                    <li key={r.id}>
                      <RessourceCardTeaser
                        ressource={r}
                        centreSlug={centre.slug}
                        onReserveClick={() => handleReserveClick(r.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <CentreEquipeSection agents={centre.agents} />
            {/* La section part ENTIÈRE, titre compris : un encart « Événements à venir au
                centre » vide annoncerait le module qu'on masque. */}
            {!agendaMasque && (
              <CentreEvenementsSection
                evenements={centre.evenementsAVenir}
                centreSlug={centre.slug}
              />
            )}
          </div>
          <aside
            className="flex flex-col"
            style={{ gap: 16 }}
            aria-label="Informations pratiques"
          >
            <CentreHoursTable horaires={centre.horaires} />
            <CentreServicesGrid services={centre.services} />
            <CentreContactCard
              telephone={centre.telephone}
              email={centre.email}
              onPhoneClick={handlePhoneClick}
              onEmailClick={handleEmailClick}
            />
          </aside>
        </div>

        {/* ──────── MOBILE empilement ──────── */}
        <div className="lg:hidden flex flex-col mt-space-3" style={{ gap: 16 }}>
          <CentreServicesGrid services={centre.services} />
          <CentreDescriptionSection description={centre.description} />

          <section aria-label="Ressources réservables">
            <div
              className="flex items-baseline justify-between"
              style={{ marginBottom: 9 }}
            >
              <h2
                className="m-0"
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  color: 'var(--gj-ink)',
                }}
              >
                Ressources réservables
              </h2>
              <Link
                href={`/centres/${centre.slug}/ressources`}
                style={{
                  fontSize: 12,
                  color: 'var(--gj-teal-deep)',
                  fontWeight: 800,
                  textDecoration: 'none',
                }}
              >
                Tout voir →
              </Link>
            </div>
            {centre.ressources.length === 0 ? (
              <p
                className="m-0"
                style={{
                  fontSize: 13,
                  color: 'var(--gj-grey)',
                  fontStyle: 'italic',
                }}
              >
                Aucune ressource réservable pour l’instant.
              </p>
            ) : (
              <ul
                className="flex flex-col m-0 p-0 list-none"
                style={{ gap: 10 }}
                aria-label="Liste des ressources"
              >
                {centre.ressources.map((r) => (
                  <li key={r.id}>
                    <RessourceCardTeaser
                      ressource={r}
                      centreSlug={centre.slug}
                      onReserveClick={() => handleReserveClick(r.id)}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <CentreEquipeSection agents={centre.agents} />
          <CentreHoursTable horaires={centre.horaires} />
          <CentreContactCard
            telephone={centre.telephone}
            email={centre.email}
            onPhoneClick={handlePhoneClick}
            onEmailClick={handleEmailClick}
          />
          <CentreEvenementsSection
            evenements={centre.evenementsAVenir}
            centreSlug={centre.slug}
          />
        </div>
      </div>

      {/* ──────── MOBILE footer sticky ──────── */}
      <div
        className="lg:hidden fixed left-0 right-0 flex"
        style={{
          bottom: 0,
          padding: 14,
          background: 'var(--gj-surface)',
          borderTop: '1px solid var(--gj-line)',
          gap: 9,
          paddingBottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
          zIndex: 30,
        }}
        aria-label="Actions principales"
      >
        <a
          href={itineraryHref}
          onClick={handleItineraryClick}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Ouvrir l’itinéraire"
          className="inline-flex items-center justify-center"
          style={{
            flex: '0 0 auto',
            width: 52,
            background: 'var(--gj-surface)',
            color: 'var(--gj-teal-deep)',
            border: '1.5px solid var(--gj-line)',
            minHeight: 50,
            borderRadius: 10,
          }}
        >
          <Icon name="pin" size={20} />
        </a>
        <a
          href={`/centres/${centre.slug}/ressources`}
          onClick={handleAppointmentClick}
          aria-label="Prendre rendez-vous"
          className="inline-flex items-center justify-center"
          style={{
            flex: 1,
            background: 'var(--gj-teal-deep)',
            color: 'var(--gj-surface)',
            minHeight: 50,
            borderRadius: 10,
            fontWeight: 800,
            fontSize: 15,
            gap: 8,
            textDecoration: 'none',
          }}
        >
          <Icon name="calendar" size={17} />
          Prendre RDV
        </a>
      </div>
    </div>
  )
}
