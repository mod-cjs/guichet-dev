'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'
import { regionLabel } from '@/lib/regions'
import { centreRgb } from '@/lib/centre-accent'

export interface CentreCardData {
  id: string
  nom: string
  /** Valeur de région (enum `Region`) — label + couleur. */
  region: string
  estActif: boolean
  /** Nombre d'agents (STAFF). */
  staff: number
  /** Jeunes rattachés. */
  jeunes: number
  /** Taux d'insertion (%). */
  insertion: number
  /** Ouvert maintenant ? + heure de fermeture. */
  ouvert: boolean
  fermeA?: string | null
  /** Services (valeurs `CentreService`). */
  services: string[]
}

export interface CentreCardProps {
  centre: CentreCardData
}

const badge: CSSProperties = { flexShrink: 0, borderRadius: 999, fontSize: 10.5, fontWeight: 800, padding: '3px 9px', display: 'inline-flex', alignItems: 'center', gap: 5 }
const statLabel: CSSProperties = { fontSize: 9.5, color: 'var(--gj-grey)', textTransform: 'uppercase', letterSpacing: '.04em', fontWeight: 800, display: 'block', marginTop: 2 }

function initials(nom: string): string {
  const parts = nom.replace(/^CJS\s+/i, '').trim().split(/\s+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? parts[0]?.[1] ?? '')).toUpperCase()
}

/**
 * CentreCard — carte « letterhead » d'un centre CJS (GUIC-682, fidélité maquette).
 * En-tête teinté par région (couleur `--cc`), 3 stats STAFF/JEUNES/INSERTION,
 * footer statut d'ouverture + services. Toute la carte ouvre la fiche.
 */
export function CentreCard({ centre }: CentreCardProps) {
  const { id, nom, region, estActif, staff, jeunes, insertion, ouvert, fermeA, services } = centre
  const rgb = centreRgb(region)
  const label = regionLabel(region) ?? region
  const rootStyle = {
    '--cc': rgb, display: 'flex', flexDirection: 'column',
    background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 15, overflow: 'hidden',
    textDecoration: 'none', color: 'inherit',
  } as CSSProperties

  return (
    <Link href={`/admin/centres/${id}`} aria-label={`Fiche de ${nom}`} className="gj-registre-card is-interactive" style={rootStyle}>
      {/* Letterhead teinté région */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 15px', borderBottom: '1px solid var(--gj-line)', background: 'rgba(var(--cc), .13)' }}>
        <span aria-hidden style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: 'grid', placeItems: 'center', color: '#fff', fontWeight: 900, background: 'rgb(var(--cc))', boxShadow: 'var(--gj-edge)' }}>{initials(nom)}</span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gj-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nom}</div>
          <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}><Icon name="pin" size={12} /> {label}</div>
        </div>
        {estActif ? (
          <span style={{ ...badge, background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)' }}><span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gj-green-ink)' }} />Actif</span>
        ) : (
          <span style={{ ...badge, background: 'var(--gj-line)', color: 'var(--gj-grey)' }}>Inactif</span>
        )}
      </div>

      {/* Corps : 3 stats + footer */}
      <div style={{ padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          <div style={{ textAlign: 'center' }}>
            <b style={{ fontSize: 17, fontWeight: 900, display: 'block', color: 'var(--gj-ink)', fontVariantNumeric: 'tabular-nums' }}>{staff}</b>
            <span style={statLabel}>Staff</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <b style={{ fontSize: 17, fontWeight: 900, display: 'block', color: 'var(--gj-ink)', fontVariantNumeric: 'tabular-nums' }}>{jeunes.toLocaleString('fr-FR')}</b>
            <span style={statLabel}>Jeunes</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <b style={{ fontSize: 17, fontWeight: 900, display: 'block', color: 'var(--gj-ink)', fontVariantNumeric: 'tabular-nums' }}>{insertion}%</b>
            <span style={statLabel}>Insertion</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', paddingTop: 11, borderTop: '1px solid var(--gj-line)', fontSize: 11, color: 'var(--gj-grey)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 800, color: ouvert ? 'var(--gj-green-ink)' : 'var(--gj-grey)' }}>
            <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: ouvert ? 'var(--gj-green-ink)' : 'var(--gj-grey)' }} />
            {ouvert ? `Ouvert · ferme ${fermeA ?? ''}` : 'Fermé'}
          </span>
          {services.length > 0 && (
            <>
              <span aria-hidden style={{ color: 'var(--gj-line-strong)' }}>·</span>
              <span style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                {services.slice(0, 3).map((s) => (
                  <span key={s} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--gj-bg)', color: 'var(--gj-grey)' }}>{s.replace(/_/g, ' ')}</span>
                ))}
                {services.length > 3 && <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: 'var(--gj-bg)', color: 'var(--gj-grey)' }}>+{services.length - 3}</span>}
              </span>
            </>
          )}
        </div>
      </div>
    </Link>
  )
}
