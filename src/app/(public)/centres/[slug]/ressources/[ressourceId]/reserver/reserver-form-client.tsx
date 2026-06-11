'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Icon, type IconName } from '@/components/ui/Icon'
import { ReservationForm } from '@/components/centres'
import type {
  CentreHoraire,
  RessourceDetail,
} from '@/lib/loaders/centres'

export interface ReserverFormClientProps {
  ressource: RessourceDetail
  centre: {
    id: string
    slug: string
    nom: string
    horaires: CentreHoraire[]
  }
  cjsUid: string
}

const TYPE_ICON: Record<string, IconName> = {
  Salle: 'users',
  Vehicule: 'car',
  Poste_info: 'desktop',
  Equipement: 'bolt',
  Atelier_recurrent: 'calendar',
}

function track(
  type: string,
  centreId: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    void fetch('/api/v1/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, centreId, metadata }),
      keepalive: true,
    })
  } catch {
    /* silencieux */
  }
}

/**
 * Wrapper client de `/centres/[slug]/ressources/[ressourceId]/reserver`.
 * Récap header ressource + délègue le formulaire à `<ReservationForm>`.
 */
export function ReserverFormClient({
  ressource,
  centre,
  cjsUid,
}: ReserverFormClientProps) {
  useEffect(() => {
    track('centre_reservation_started', centre.id, {
      ressourceId: ressource.id,
      type: ressource.type,
    })
  }, [centre.id, ressource.id, ressource.type])

  const iconName: IconName = TYPE_ICON[ressource.type] ?? 'document'

  return (
    <div
      style={{ maxWidth: 980, margin: '0 auto', width: '100%', padding: 16 }}
    >
      {/* Breadcrumb */}
      <nav
        aria-label="Fil d'Ariane"
        style={{
          fontSize: 12.5,
          color: 'var(--gj-grey)',
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginBottom: 8,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href={`/centres/${centre.slug}/ressources`}
          style={{
            color: 'var(--gj-teal-deep)',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          Ressources
        </Link>
        <Icon name="chevron-right" size={13} aria-hidden="true" />
        <span style={{ fontWeight: 700, color: 'var(--gj-ink)' }}>
          Réserver
        </span>
      </nav>

      <h1
        style={{
          fontSize: 24,
          fontWeight: 900,
          color: 'var(--gj-ink)',
          margin: '6px 0 16px',
        }}
      >
        Réserver une ressource
      </h1>

      {/* Récap ressource */}
      <div
        style={{
          background: 'var(--gj-surface)',
          border: '1.5px solid var(--gj-line)',
          borderRadius: 14,
          padding: 16,
          display: 'flex',
          gap: 14,
          alignItems: 'center',
          marginBottom: 18,
        }}
      >
        <span
          aria-hidden="true"
          style={{
            width: 52,
            height: 52,
            borderRadius: 12,
            flexShrink: 0,
            background: 'var(--gj-teal-soft)',
            color: 'var(--gj-teal-deep)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name={iconName} size={26} />
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{ fontSize: 15, fontWeight: 900, color: 'var(--gj-ink)' }}
          >
            {ressource.nom}
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: 'var(--gj-grey)',
              marginTop: 2,
            }}
          >
            {centre.nom} · {ressource.capacite}{' '}
            {ressource.capaciteUnit ?? 'pers.'}
          </div>
        </div>
        <span
          style={{
            fontSize: 10.5,
            fontWeight: 800,
            color: 'var(--gj-green-ink)',
            background: 'var(--gj-green-soft)',
            padding: '3px 10px',
            borderRadius: 999,
          }}
        >
          Gratuit
        </span>
      </div>

      <ReservationForm
        ressource={{
          id: ressource.id,
          type: ressource.type,
          nom: ressource.nom,
          capacite: ressource.capacite,
          capaciteUnit: ressource.capaciteUnit,
          dureeMinCreneauMin: ressource.dureeMinCreneauMin,
          requiresJustif: ressource.requiresJustif,
        }}
        centre={centre}
        cjsUid={cjsUid}
      />
    </div>
  )
}
