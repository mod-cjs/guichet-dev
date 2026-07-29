'use client'

import Link from 'next/link'
import type { CSSProperties } from 'react'
import { Icon } from '@/components/ui/Icon'
import { regionLabel } from '@/lib/regions'
import { centreAccent } from '@/lib/centre-accent'

export interface CentreCardData {
  id: string
  nom: string
  /** Valeur de région (enum `Region`) — sert au label et à l'accent. */
  region: string
  estActif: boolean
  jeunes: number
  agents: number
}

export interface CentreCardProps {
  centre: CentreCardData
  onEdit: (centre: CentreCardData) => void
  onDelete: (centre: CentreCardData) => void
}

const badge: CSSProperties = {
  flexShrink: 0,
  borderRadius: 999,
  fontSize: 10,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '.04em',
  padding: '3px 8px',
}

const footBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  fontWeight: 800,
  fontSize: 12,
  borderRadius: 9,
  padding: '8px 12px',
  minHeight: 40,
  background: 'transparent',
  color: 'var(--gj-grey)',
  border: '1.5px solid var(--gj-line)',
  cursor: 'pointer',
  textDecoration: 'none',
}

const statLabel: CSSProperties = { fontSize: 9.5, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--gj-grey)', display: 'block', marginTop: 2 }

function initials(nom: string): string {
  const parts = nom.trim().split(/\s+/).filter(Boolean)
  const meaningful = parts.filter((p) => !/^(de|du|des|la|le)$/i.test(p))
  const src = meaningful.length ? meaningful : parts
  if (src.length >= 2) return (src[0][0] + src[1][0]).toUpperCase()
  return nom.slice(0, 2).toUpperCase()
}

/**
 * CentreCard — carte « letterhead » d'un centre CJS (GUIC-682).
 *
 * Langage registre (`gj-registre-card`) ; en-tête teinté par la région
 * (accent dérivé, tokens `*-soft`/`*-ink` theme-aware), bande de stats
 * Jeunes/Agents à séparateur, et footer d'actions inline (Ressources /
 * Éditer / Supprimer). Aucune valeur hex, tout par tokens `gj-*`.
 */
export function CentreCard({ centre, onEdit, onDelete }: CentreCardProps) {
  const { id, nom, region, estActif, jeunes, agents } = centre
  const accent = centreAccent(region)
  const label = regionLabel(region) ?? region

  const rootStyle = {
    '--soft': `var(${accent.soft})`,
    '--ink': `var(${accent.ink})`,
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--gj-surface)',
    border: '1.5px solid var(--gj-line)',
    borderRadius: 15,
    overflow: 'hidden',
  } as CSSProperties

  return (
    <div className="gj-registre-card" style={rootStyle}>
     <Link href={`/admin/centres/${id}`} aria-label={`Fiche de ${nom}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      {/* Letterhead teinté région */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 15px', borderBottom: '1px solid var(--gj-line)', background: 'var(--soft)' }}>
        <span
          aria-hidden
          style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0, display: 'inline-grid', placeItems: 'center', color: 'var(--color-text-on-dark)', fontWeight: 900, fontSize: 14, background: 'var(--ink)', boxShadow: 'var(--gj-edge)' }}
        >
          {initials(nom)}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: 'var(--gj-ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{nom}</div>
          <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 5 }}>
            <Icon name="pin" size={12} /> {label}
          </div>
        </div>
        {estActif ? (
          <span style={{ ...badge, background: 'var(--gj-green-soft)', color: 'var(--gj-green-ink)' }}>Actif</span>
        ) : (
          <span style={{ ...badge, background: 'var(--gj-line)', color: 'var(--gj-grey)' }}>Inactif</span>
        )}
      </div>

      {/* Bande de stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', padding: '12px 0' }}>
        <div style={{ textAlign: 'center' }}>
          <b style={{ fontSize: 18, fontWeight: 900, color: 'var(--gj-ink)', fontVariantNumeric: 'tabular-nums' }}>{jeunes.toLocaleString('fr-FR')}</b>
          <span style={statLabel}>Jeunes</span>
        </div>
        <div style={{ textAlign: 'center', borderLeft: '1px solid var(--gj-line)' }}>
          <b style={{ fontSize: 18, fontWeight: 900, color: 'var(--gj-ink)', fontVariantNumeric: 'tabular-nums' }}>{agents}</b>
          <span style={statLabel}>Agents</span>
        </div>
      </div>
     </Link>

      {/* Footer actions */}
      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderTop: '1px solid var(--gj-line)' }}>
        <Link href={`/admin/centres/${id}?tab=ressources`} aria-label={`Ressources de ${nom}`} style={footBtn}>
          <Icon name="resources" size={14} /> Ressources
        </Link>
        <button type="button" aria-label={`Modifier ${nom}`} onClick={() => onEdit(centre)} style={{ ...footBtn, marginLeft: 'auto', color: 'var(--gj-teal-deep)', borderColor: 'var(--gj-teal)' }}>
          <Icon name="settings" size={14} />
        </button>
        <button type="button" aria-label={`Supprimer ${nom}`} onClick={() => onDelete(centre)} style={{ ...footBtn, color: 'var(--gj-red)', borderColor: 'var(--gj-red-soft)' }}>
          <Icon name="close" size={14} />
        </button>
      </div>
    </div>
  )
}
