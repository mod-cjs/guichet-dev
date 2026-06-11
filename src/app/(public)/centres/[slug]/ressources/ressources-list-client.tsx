'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Icon } from '@/components/ui/Icon'
import {
  RessourceCard,
  RessourceTypeFilter,
  type RessourceTypeValue,
} from '@/components/centres'
import type { RessourceDetail } from '@/lib/loaders/centres'

export interface RessourcesListClientProps {
  ressources: RessourceDetail[]
  centre: { id: string; slug: string; nom: string }
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
 * Client orchestrateur — pills filtre type + liste + banner info teal-soft.
 *
 * Spec : M4-centres-lot7.md §5 Wave 4.
 */
export function RessourcesListClient({
  ressources,
  centre,
}: RessourcesListClientProps) {
  const [type, setType] = useState<RessourceTypeValue>('Toutes')

  useEffect(() => {
    track('centre_resource_viewed', centre.id, { count: ressources.length })
  }, [centre.id, ressources.length])

  const filtered = useMemo(() => {
    if (type === 'Toutes') return ressources
    return ressources.filter((r) => r.type === type)
  }, [ressources, type])

  const counts = useMemo(() => {
    const c: Partial<Record<RessourceTypeValue, number>> = {
      Toutes: ressources.length,
    }
    for (const r of ressources) {
      const k = r.type as RessourceTypeValue
      c[k] = (c[k] ?? 0) + 1
    }
    return c
  }, [ressources])

  const handleTypeChange = (v: RessourceTypeValue) => {
    setType(v)
    track('centre_resource_filter', centre.id, { type: v })
  }

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
          href={`/centres/${centre.slug}`}
          style={{
            color: 'var(--gj-teal-deep)',
            fontWeight: 700,
            textDecoration: 'none',
          }}
        >
          CJS {centre.nom}
        </Link>
        <Icon name="chevron-right" size={13} aria-hidden="true" />
        <span style={{ fontWeight: 700, color: 'var(--gj-ink)' }}>
          Ressources
        </span>
      </nav>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 14,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 24,
              fontWeight: 900,
              color: 'var(--gj-ink)',
              margin: 0,
            }}
          >
            Ressources réservables
          </h1>
          <p
            style={{
              fontSize: 13,
              color: 'var(--gj-grey)',
              marginTop: 3,
              marginBottom: 0,
            }}
          >
            Salles, véhicules et postes informatiques · gratuits sur réservation
          </p>
        </div>
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            color: 'var(--gj-ink)',
            padding: '9px 14px',
            borderRadius: 9,
            fontWeight: 800,
            fontSize: 12.5,
          }}
        >
          <Icon name="pin" size={15} aria-hidden="true" />
          CJS {centre.nom}
        </span>
      </div>

      <div style={{ marginBottom: 16 }}>
        <RessourceTypeFilter
          value={type}
          onChange={handleTypeChange}
          counts={counts}
        />
      </div>

      {filtered.length === 0 ? (
        <div
          role="status"
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px dashed var(--gj-line)',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            color: 'var(--gj-grey)',
            fontSize: 13.5,
          }}
        >
          Aucune ressource disponible pour ce filtre.
        </div>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
          }}
        >
          {filtered.map((r) => (
            <RessourceCard
              key={r.id}
              ressource={r}
              centreSlug={centre.slug}
            />
          ))}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 10,
          background: 'var(--gj-teal-soft)',
          borderRadius: 12,
          padding: '13px 16px',
          marginTop: 18,
        }}
      >
        <Icon
          name="info"
          size={18}
          aria-hidden="true"
          style={{ color: 'var(--gj-teal-deep)', flexShrink: 0, marginTop: 1 }}
        />
        <p
          style={{
            fontSize: 12.5,
            color: 'var(--gj-teal-deep)',
            fontWeight: 600,
            lineHeight: 1.45,
            margin: 0,
          }}
        >
          Toutes les ressources sont <b>gratuites</b>. Ta demande est validée
          par le centre (réponse sous 24–48 h). Le retrait se fait avec ton{' '}
          <b>QR carte CJS</b>.
        </p>
      </div>
    </div>
  )
}
