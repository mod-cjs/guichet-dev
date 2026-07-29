'use client'

import type { CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'
import { sectorVar, sectorLabel } from '@/lib/partenaire-secteur'

export interface PartenaireCardData {
  id: string
  nom: string
  secteur: string | null
  region: string | null
  estVerifie: boolean
  opportunitesCount: number
  logoUrl?: string | null
}

export interface PartenaireCardProps {
  partenaire: PartenaireCardData
  /** Ouvre le dossier (panneau slide-over) — reçoit l'id. */
  onOpen?: (id: string) => void
}

function initials(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return nom.slice(0, 2).toUpperCase()
}

/**
 * PartenaireCard — carte « letterhead » d'une organisation recruteur (GUIC-681).
 *
 * Langage registre : surface plate (`gj-registre-card` = liseré + survol relevé),
 * en-tête teinté par la couleur du **secteur** (`--sc` → token `--gj-sector-*`),
 * pastille pleine, badge vérifié. Cliquable : ouvre le dossier via `onOpen`.
 */
export function PartenaireCard({ partenaire, onOpen }: PartenaireCardProps) {
  const { id, nom, secteur, region, estVerifie, logoUrl, opportunitesCount } = partenaire
  const cardStyle = {
    '--sc': `var(${sectorVar(secteur)})`,
    display: 'flex',
    flexDirection: 'column',
    textAlign: 'left',
    background: 'var(--gj-surface)',
    border: '1.5px solid var(--gj-line)',
    borderRadius: 15,
    overflow: 'hidden',
    padding: 0,
    cursor: 'pointer',
    color: 'inherit',
    fontFamily: 'inherit',
    width: '100%',
  } as CSSProperties

  return (
    <button type="button" className="gj-registre-card is-interactive" style={cardStyle} onClick={() => onOpen?.(id)}>
      {/* Letterhead teinté secteur */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '14px 15px',
          borderBottom: '1px solid var(--gj-line)',
          background: 'rgba(var(--sc), .12)',
        }}
      >
        {logoUrl ? (
          <img
            src={logoUrl}
            alt=""
            width={44}
            height={44}
            style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', background: '#fff', flexShrink: 0, boxShadow: 'var(--gj-edge)' }}
          />
        ) : (
          <span
            aria-hidden
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              flexShrink: 0,
              display: 'inline-grid',
              placeItems: 'center',
              color: '#fff',
              fontWeight: 900,
              fontSize: 14,
              background: 'rgb(var(--sc))',
              boxShadow: 'var(--gj-edge)',
            }}
          >
            {initials(nom)}
          </span>
        )}
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gj-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {nom}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 2 }}>
            {sectorLabel(secteur)}
            {region ? ` · ${region.replace(/_/g, ' ')}` : ''}
          </div>
        </div>
        {estVerifie ? (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, flexShrink: 0, borderRadius: 999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', padding: '3px 8px', background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)' }}>
            <Icon name="check-circle" size={11} /> Vérifié
          </span>
        ) : (
          <span style={{ flexShrink: 0, borderRadius: 999, fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', padding: '3px 8px', background: 'var(--gj-yellow-soft)', color: 'var(--gj-yellow-ink)' }}>
            Non vérifié
          </span>
        )}
      </div>

      {/* Corps : offres publiées */}
      <div style={{ padding: '12px 15px', fontSize: 12.5, color: 'var(--gj-grey)' }}>
        <b style={{ color: 'var(--gj-ink)', fontSize: 15 }}>{opportunitesCount}</b>{' '}
        offre{opportunitesCount > 1 ? 's' : ''} publiée{opportunitesCount > 1 ? 's' : ''}
      </div>
    </button>
  )
}
