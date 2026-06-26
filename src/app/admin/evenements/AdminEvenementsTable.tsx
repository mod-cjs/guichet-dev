'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { EvenementFormModal, type EvenementFormValues } from './EvenementFormModal'
import { supprimerEvenement } from './actions'

// ─── types ────────────────────────────────────────────────────────────────────

/** TypeEvenement enum — mirrors prisma/schema.prisma */
export type TypeEvenement = 'Formation' | 'Atelier' | 'Forum' | 'Webinar' | 'Conference'
/** StatutEvenement enum — mirrors prisma/schema.prisma */
export type StatutEvenement = 'a_venir' | 'en_cours' | 'termine' | 'annule'

export interface EvenementRow {
  id: string
  titre: string
  type: TypeEvenement
  statut: StatutEvenement
  /** Date de début formatée fr-FR (serveur) */
  dateLabel: string
  /** Lieu ou nom du centre */
  lieuLabel: string
  /** Inscrits = _count.inscriptions (réel Prisma) */
  inscrits: number
  /** Capacité max (nullable dans le modèle) */
  capaciteMax: number | null
  /** Champs bruts pour l'édition */
  description: string
  lieu: string
  dateDebutIso: string
  estGratuit: boolean
}

export interface AdminEvenementsTableProps {
  evenements: EvenementRow[]
  total: number
  activeStatut: StatutEvenement | null
  counts: Partial<Record<StatutEvenement, number>>
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const STATUT_LABEL: Record<StatutEvenement, string> = {
  a_venir: 'À venir',
  en_cours: 'En cours',
  termine: 'Terminé',
  annule: 'Annulé',
}

const STATUT_TONE: Record<StatutEvenement, { bg: string; fg: string }> = {
  a_venir: { bg: 'var(--gj-teal-soft)', fg: 'var(--gj-teal-ink)' },
  en_cours: { bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' },
  termine: { bg: 'var(--gj-bg)', fg: 'var(--gj-grey)' },
  annule: { bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
}

const STATUT_ORDER: StatutEvenement[] = ['a_venir', 'en_cours', 'termine', 'annule']

function inscritsLabel(row: EvenementRow): string {
  if (row.capaciteMax != null) return `${row.inscrits} / ${row.capaciteMax}`
  return String(row.inscrits)
}

// ─── sub-components ──────────────────────────────────────────────────────────

function TypePill({ type }: { type: TypeEvenement }) {
  return (
    <span
      className="inline-block rounded-full text-[10.5px] font-black px-[9px] py-[2px]"
      style={{ background: 'var(--gj-blue-soft)', color: 'var(--gj-blue-ink)' }}
    >
      {type}
    </span>
  )
}

function StatutPill({ statut }: { statut: StatutEvenement }) {
  const tone = STATUT_TONE[statut]
  return (
    <span
      className="inline-flex items-center gap-[6px] text-[12px] font-bold"
      style={{ color: tone.fg }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: 8, height: 8, background: tone.fg }}
        aria-hidden
      />
      {STATUT_LABEL[statut]}
    </span>
  )
}

function FilterChips({
  activeStatut,
  counts,
}: {
  activeStatut: StatutEvenement | null
  counts: Partial<Record<StatutEvenement, number>>
}) {
  const chip = (href: string, label: string, active: boolean, count?: number) => (
    <Link
      href={href}
      aria-current={active ? 'true' : undefined}
      className="inline-flex items-center gap-[6px] rounded-full text-[12.5px] font-bold px-[13px] py-[6px] whitespace-nowrap"
      style={{
        background: active ? 'var(--gj-teal-deep)' : 'var(--gj-surface)',
        color: active ? 'var(--gj-surface)' : 'var(--gj-grey)',
        border: active ? '1.5px solid var(--gj-teal-deep)' : '1.5px solid var(--gj-line)',
      }}
    >
      {label}
      {count != null && <span className="opacity-70">{count}</span>}
    </Link>
  )
  return (
    <div className="flex items-center gap-[8px] flex-wrap mb-4">
      {chip('/admin/evenements', 'Tous', activeStatut === null)}
      {STATUT_ORDER.map((s) =>
        chip(`/admin/evenements?statut=${s}`, STATUT_LABEL[s], activeStatut === s, counts[s]),
      )}
    </div>
  )
}

function EvenementMobileCard({ row }: { row: EvenementRow }) {
  return (
    <div className="flex gap-3 items-start p-[14px] border-b border-gj-line last:border-b-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13.5px] font-black" style={{ color: 'var(--gj-ink)' }}>
            {row.titre}
          </p>
          <TypePill type={row.type} />
        </div>
        <p className="text-[11.5px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
          {row.dateLabel} · {row.lieuLabel}
        </p>
        <div className="flex items-center gap-3 mt-[8px]">
          <StatutPill statut={row.statut} />
          <span className="text-[12px] font-bold" style={{ color: 'var(--gj-grey)' }}>
            {inscritsLabel(row)} inscrits
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

/**
 * AdminEvenementsTable — Lot 11 admin · Événements.
 * Données réelles Prisma (Evenement) : titre, type, statut, dateDebut, lieu/centre,
 * _count.inscriptions, capaciteMax. Aucune métrique fabriquée.
 */
export function AdminEvenementsTable({
  evenements,
  total,
  activeStatut,
  counts,
}: AdminEvenementsTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editEvent, setEditEvent] = useState<EvenementFormValues | undefined>(undefined)
  const [, startTransition] = useTransition()

  function openCreate() {
    setEditEvent(undefined)
    setModalOpen(true)
  }
  function openEdit(row: EvenementRow) {
    setEditEvent({
      id: row.id,
      titre: row.titre,
      description: row.description,
      type: row.type,
      statut: row.statut,
      dateDebut: row.dateDebutIso,
      lieu: row.lieu,
      capaciteMax: row.capaciteMax,
      estGratuit: row.estGratuit,
    })
    setModalOpen(true)
  }
  function handleDelete(row: EvenementRow) {
    if (typeof window !== 'undefined' && !window.confirm(`Supprimer l'événement « ${row.titre} » ?`)) return
    startTransition(() => { void supprimerEvenement(row.id) })
  }

  return (
    <>
    <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        {/* Header */}
        <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-[24px] font-black" style={{ color: 'var(--gj-ink)' }}>
              Événements
            </h1>
            <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
              {total} événements
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            onClick={openCreate}
            className="inline-flex items-center gap-[7px] font-black text-[13.5px] !rounded-[10px]"
            style={{ background: 'var(--gj-teal-deep)' }}
            type="button"
          >
            <Icon name="plus" size={16} />
            Ajouter un événement
          </Button>
        </div>

        <FilterChips activeStatut={activeStatut} counts={counts} />

        {/* Empty state */}
        {evenements.length === 0 && (
          <div
            className="rounded-[14px] p-[32px] text-center"
            style={{
              background: 'var(--gj-surface)',
              border: '1.5px solid var(--gj-line)',
              color: 'var(--gj-grey)',
            }}
          >
            <Icon name="calendar" size={32} className="mx-auto mb-[10px] opacity-40" />
            <p className="text-[14px] font-bold">Aucun événement pour le moment.</p>
          </div>
        )}

        {/* Table desktop + cards mobile */}
        {evenements.length > 0 && (
          <div
            className="rounded-[14px] overflow-hidden"
            style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)' }}
          >
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 680 }}>
                <thead>
                  <tr style={{ background: 'var(--gj-bg)', borderBottom: '1.5px solid var(--gj-line)' }}>
                    {['Événement', 'Date', 'Lieu / Centre', 'Inscrits', 'Statut', ''].map((label) => (
                      <th
                        key={label || 'action'}
                        className="text-left px-[18px] py-[12px]"
                        style={{
                          fontSize: '10.5px',
                          fontWeight: 800,
                          color: 'var(--gj-grey)',
                          textTransform: 'uppercase',
                          letterSpacing: '.4px',
                        }}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evenements.map((row) => (
                    <tr
                      key={row.id}
                      style={{ borderBottom: '1px solid var(--gj-line)' }}
                      className="last:border-b-0"
                    >
                      <td className="px-[18px] py-[13px]">
                        <div className="flex items-center gap-[10px] flex-wrap">
                          <Link
                            href={`/admin/evenements/${row.id}`}
                            className="text-[13.5px] font-black hover:underline"
                            style={{ color: 'var(--gj-ink)', textDecoration: 'none' }}
                          >
                            {row.titre}
                          </Link>
                          <TypePill type={row.type} />
                        </div>
                      </td>
                      <td className="px-[18px] py-[13px] text-[13px]" style={{ color: 'var(--gj-grey)' }}>
                        {row.dateLabel}
                      </td>
                      <td className="px-[18px] py-[13px] text-[13px]" style={{ color: 'var(--gj-grey)' }}>
                        {row.lieuLabel}
                      </td>
                      <td className="px-[18px] py-[13px] text-[13px] font-bold" style={{ color: 'var(--gj-ink)' }}>
                        {inscritsLabel(row)}
                      </td>
                      <td className="px-[18px] py-[13px]">
                        <StatutPill statut={row.statut} />
                      </td>
                      <td className="px-[18px] py-[13px] text-right">
                        <div className="inline-flex items-center gap-[6px]">
                          <button
                            type="button"
                            aria-label="Modifier"
                            onClick={() => openEdit(row)}
                            className="inline-flex items-center justify-center rounded-[8px]"
                            style={{
                              width: 32,
                              height: 32,
                              border: '1.5px solid var(--gj-line)',
                              background: 'var(--gj-surface)',
                              color: 'var(--gj-grey)',
                            }}
                          >
                            <Icon name="settings" size={15} />
                          </button>
                          <button
                            type="button"
                            aria-label="Supprimer"
                            onClick={() => handleDelete(row)}
                            className="inline-flex items-center justify-center rounded-[8px]"
                            style={{
                              width: 32,
                              height: 32,
                              border: '1.5px solid var(--gj-red)',
                              background: 'var(--gj-surface)',
                              color: 'var(--gj-red-ink)',
                            }}
                          >
                            <Icon name="block" size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden">
              {evenements.map((row) => (
                <EvenementMobileCard key={row.id} row={row} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
    <EvenementFormModal
      key={editEvent?.id ?? 'new'}
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      evenement={editEvent}
    />
    </>
  )
}
