'use client'

import { useMemo, useState } from 'react'
import type { CSSProperties } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { CentreFormModal } from './CentreFormModal'
import type { ProgrammeOption } from '@/components/admin/ProgrammesField'
import { CentreCard } from '@/components/ui/CentreCard'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CentreRow {
  id: string
  nom: string
  region: string
  adresse: string
  latitude: number
  longitude: number
  telephone: string
  estActif: boolean
  responsable: string
  ville: string | null
  createdAt: Date
  staff: number
  jeunes: number
  insertion: number
  ouvert: boolean
  fermeA: string | null
  services: string[]
  nouveau: boolean
}

export interface CentresStats {
  actifs: number
  total: number
  conseillers: number
  jeunes: number
  regions: number
}

interface CentresAdminTableProps {
  centres: CentreRow[]
  stats: CentresStats
  /** GUIC-684 — catalogue programmes pour le rattachement à la création. */
  programmes?: ProgrammeOption[]
}

const card: CSSProperties = { background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 15, boxShadow: 'var(--gj-edge)', padding: '15px 16px' }

// ─── Skeleton loading (exported for Suspense fallback) ────────────────────────

export function CentresAdminTableSkeleton() {
  return (
    <div style={{ padding: '22px 28px 40px', overflowY: 'auto', flex: 1 }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]" style={{ marginBottom: 18 }}>
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} height="86px" rounded="15px" />)}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]">
          {[1, 2, 3, 4, 5, 6].map((i) => <Skeleton key={i} height="190px" rounded="15px" />)}
        </div>
      </div>
    </div>
  )
}

// ─── KPI card ─────────────────────────────────────────────────────────────────

function Kpi({ value, sub, label, pill, pillTone }: { value: string; sub?: string; label: string; pill?: string; pillTone?: 'green' | 'yellow' }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11.5, color: 'var(--gj-grey)', fontWeight: 700 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 900, color: 'var(--gj-ink)', margin: '6px 0 4px', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
        {value}{sub && <span style={{ fontSize: 14, color: 'var(--gj-grey)', fontWeight: 700 }}> {sub}</span>}
      </div>
      {pill && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: pillTone === 'yellow' ? 'var(--gj-yellow-soft)' : 'var(--gj-green-soft)', color: pillTone === 'yellow' ? 'var(--gj-yellow-ink)' : 'var(--gj-green-ink)' }}>
          {pillTone !== 'yellow' && <span aria-hidden style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gj-green-ink)' }} />}{pill}
        </span>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

type Filtre = 'tous' | 'actifs' | 'nouveaux'

export function CentresAdminTable({ centres, stats, programmes = [] }: CentresAdminTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [q, setQ] = useState('')
  const [filtre, setFiltre] = useState<Filtre>('tous')

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase()
    return centres.filter((c) => {
      if (filtre === 'actifs' && !c.estActif) return false
      if (filtre === 'nouveaux' && !c.nouveau) return false
      if (needle && !(`${c.nom} ${c.region}`.toLowerCase().includes(needle))) return false
      return true
    })
  }, [centres, q, filtre])

  const chips: { value: Filtre; label: string }[] = [
    { value: 'tous', label: 'Tous' },
    { value: 'actifs', label: 'Actifs' },
    { value: 'nouveaux', label: 'Nouveaux' },
  ]

  return (
    <>
      <div style={{ maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 16 }}>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>Centres CJS</h1>
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: '3px 0 0' }}>Réseau · {stats.total} centres</p>
        </div>

        {/* KPIs réseau */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-[14px]" style={{ marginBottom: 18 }}>
          <Kpi label="Centres actifs" value={String(stats.actifs)} sub={`/ ${stats.total}`} pill="opérationnels" />
          <Kpi label="Conseillers rattachés" value={stats.conseillers.toLocaleString('fr-FR')} pill="équipes terrain" pillTone="green" />
          <Kpi label="Jeunes suivis" value={stats.jeunes.toLocaleString('fr-FR')} />
          <Kpi label="Couverture" value={String(stats.regions)} sub="régions" pill={`${Math.max(0, 14 - stats.regions)} à couvrir`} pillTone="yellow" />
        </div>

        {/* Recherche + Ajouter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 220, background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 11, padding: '9px 12px' }}>
            <Icon name="search" size={15} style={{ color: 'var(--gj-grey)' }} />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un centre, une région…" aria-label="Rechercher un centre" style={{ flex: 1, border: 0, background: 'transparent', color: 'var(--gj-ink)', fontFamily: 'inherit', fontSize: 13, outline: 'none' }} />
          </div>
          <Button variant="primary" onClick={() => setModalOpen(true)} aria-label="Ajouter un centre"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, background: 'var(--gj-teal-deep)', color: 'var(--gj-surface)', border: 0, padding: '11px 18px', borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: 'pointer' }}>
            <Icon name="plus" size={16} /> Ajouter un centre
          </Button>
        </div>

        {/* Filtres */}
        <div role="tablist" aria-label="Filtrer les centres" style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
          {chips.map((c) => {
            const on = filtre === c.value
            return (
              <button key={c.value} type="button" role="tab" aria-selected={on} onClick={() => setFiltre(c.value)}
                style={{ fontSize: 12.5, fontWeight: 700, borderRadius: 999, padding: '6px 14px', cursor: 'pointer', border: on ? 0 : '1px solid var(--gj-line)', background: on ? 'var(--gj-admin-gold)' : 'var(--gj-surface)', color: on ? 'var(--gj-admin-on-gold)' : 'var(--gj-grey)' }}>
                {c.label}
              </button>
            )
          })}
        </div>

        {/* Grille */}
        {filtered.length === 0 ? (
          <div aria-label="Liste des centres CJS" style={{ ...card, padding: '48px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>
            <Icon name="pin" size={40} style={{ color: 'var(--gj-line-strong)', display: 'block', margin: '0 auto 12px' }} />
            Aucun centre pour ce filtre.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]" aria-label="Liste des centres CJS">
            {filtered.map((c) => (
              <CentreCard key={c.id} centre={{ id: c.id, nom: c.nom, region: c.region, estActif: c.estActif, staff: c.staff, jeunes: c.jeunes, insertion: c.insertion, ouvert: c.ouvert, fermeA: c.fermeA, services: c.services }} />
            ))}
          </div>
        )}
      </div>

      <CentreFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} programmes={programmes} />
    </>
  )
}
