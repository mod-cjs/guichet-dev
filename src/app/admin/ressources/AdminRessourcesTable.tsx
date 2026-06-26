'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { RessourceFormModal } from './RessourceFormModal'
import { supprimerRessource } from './actions'

// ─── types ────────────────────────────────────────────────────────────────────

/** TypeRessource enum values — mirrors prisma/schema.prisma */
export type TypeRessource = 'PDF' | 'Video' | 'Lien' | 'Guide' | 'Outil'

export interface RessourceRow {
  id: string
  titre: string
  /** Description (édition) */
  description: string
  type: TypeRessource
  /** URL de la ressource (édition) */
  url: string
  /** Catégorie explicite (nullable) */
  categorie: string | null
  /** Thème : fallback si categorie absente */
  theme: string
  /** Nombre de vues (pas de champ downloads — mapping réel Prisma) */
  vues: number
  /** Derived status: true=Publié, false=Brouillon */
  estPublic: boolean
}

export interface AdminRessourcesTableProps {
  ressources: RessourceRow[]
  total: number
  /** Page courante (1-based) — défaut 1 */
  currentPage?: number
  /** Nombre total de pages — défaut 1 (pas de pagination) */
  totalPages?: number
}

// ─── helpers ──────────────────────────────────────────────────────────────────

/** Format badge label for a given TypeRessource. */
function formatBadgeLabel(type: TypeRessource): string {
  return type // enum values are already display-ready (PDF, Video, Lien, Guide, Outil)
}

/** Format view count: "—" if 0, otherwise localised number. */
function formatVues(vues: number): string {
  if (vues === 0) return '—'
  return vues.toLocaleString('fr-FR')
}

// ─── sub-components ──────────────────────────────────────────────────────────

interface TypeBadgeProps {
  type: TypeRessource
}

/**
 * Square badge showing resource format type.
 * Uses gj-red-soft / gj-red-ink color pair (matches design reference admin-web2.jsx).
 */
function TypeBadge({ type }: TypeBadgeProps) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-[5px] shrink-0 font-black"
      style={{
        width: 32,
        height: 38,
        fontSize: '8.5px',
        background: 'var(--gj-red-soft)',
        color: 'var(--gj-red-ink)',
      }}
      aria-label={`Format : ${formatBadgeLabel(type)}`}
    >
      {formatBadgeLabel(type)}
    </span>
  )
}

interface StatutPillProps {
  estPublic: boolean
}

/** Pill Publié (green-soft) / Brouillon (grey/bg) derived from estPublic. */
function StatutPill({ estPublic }: StatutPillProps) {
  if (estPublic) {
    return (
      <span
        className="inline-block rounded-full text-[11px] font-black px-[10px] py-[3px]"
        style={{
          background: 'var(--gj-green-soft)',
          color: 'var(--gj-green-ink)',
        }}
      >
        Publié
      </span>
    )
  }
  return (
    <span
      className="inline-block rounded-full text-[11px] font-black px-[10px] py-[3px]"
      style={{
        background: 'var(--gj-bg)',
        color: 'var(--gj-grey)',
      }}
    >
      Brouillon
    </span>
  )
}

// ─── mobile card ─────────────────────────────────────────────────────────────

function RessourceMobileCard({ row, onEdit }: { row: RessourceRow; onEdit: (row: RessourceRow) => void }) {
  const categorie = row.categorie ?? row.theme
  return (
    <div
      className="flex gap-3 items-start p-[14px] border-b border-gj-line last:border-b-0"
    >
      <TypeBadge type={row.type} />
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-black" style={{ color: 'var(--gj-ink)' }}>
          {row.titre}
        </p>
        <p className="text-[11.5px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
          {categorie}
        </p>
        <div className="flex items-center gap-2 mt-[8px]">
          <StatutPill estPublic={row.estPublic} />
          <span className="text-[12px] font-bold" style={{ color: 'var(--gj-grey)' }}>
            {formatVues(row.vues)} vues
          </span>
        </div>
      </div>
      <button
        type="button"
        aria-label="Modifier"
        onClick={() => onEdit(row)}
        className="inline-flex items-center justify-center rounded-[8px] shrink-0"
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
    </div>
  )
}

// ─── main component ──────────────────────────────────────────────────────────

/**
 * AdminRessourcesTable — Lot 11 admin · Contenu / médiathèque
 *
 * Data mapping decisions:
 * - `vues`     → colonne "Vues" (no downloads field in Ressource model)
 * - `estPublic`→ statut Publié (true) / Brouillon (false)
 * - `categorie ?? theme` → colonne "Catégorie"
 */
export function AdminRessourcesTable({ ressources, total, currentPage = 1, totalPages = 1 }: AdminRessourcesTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editRow, setEditRow] = useState<RessourceRow | undefined>(undefined)
  const [, startTransition] = useTransition()

  function openCreate() {
    setEditRow(undefined)
    setModalOpen(true)
  }
  function openEdit(row: RessourceRow) {
    setEditRow(row)
    setModalOpen(true)
  }
  function handleDelete(row: RessourceRow) {
    if (typeof window !== 'undefined' && !window.confirm(`Supprimer « ${row.titre} » ?`)) return
    startTransition(() => { void supprimerRessource(row.id) })
  }

  return (
    <>
      <div style={{ padding: '22px 28px 40px' }}>
      <div style={{ maxWidth: 880, margin: '0 auto' }}>
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div
          className="flex items-end justify-between flex-wrap gap-3 mb-4"
        >
          <div>
            <h1
              className="text-[24px] font-black"
              style={{ color: 'var(--gj-ink)' }}
            >
              Contenu · médiathèque
            </h1>
            <p className="text-[13px] mt-[3px]" style={{ color: 'var(--gj-grey)' }}>
              {total} ressources
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
            Ajouter une ressource
          </Button>
        </div>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {ressources.length === 0 && (
          <div
            className="rounded-[14px] p-[32px] text-center"
            style={{
              background: 'var(--gj-surface)',
              border: '1.5px solid var(--gj-line)',
              color: 'var(--gj-grey)',
            }}
          >
            <Icon name="resources" size={32} className="mx-auto mb-[10px] opacity-40" />
            <p className="text-[14px] font-bold">Aucune ressource pour le moment.</p>
          </div>
        )}

        {/* ── Table (desktop) + Card list (mobile) ────────────────────── */}
        {ressources.length > 0 && (
          <div
            className="rounded-[14px] overflow-hidden"
            style={{
              background: 'var(--gj-surface)',
              border: '1.5px solid var(--gj-line)',
            }}
          >
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: 600 }}>
                <thead>
                  <tr
                    style={{
                      background: 'var(--gj-bg)',
                      borderBottom: '1.5px solid var(--gj-line)',
                    }}
                  >
                    {(
                      [
                        ['Ressource', '2.4fr'],
                        ['Catégorie', '1.2fr'],
                        ['Vues', '1fr'],
                        ['Statut', '1fr'],
                        ['', '0.5fr'],
                      ] as [string, string][]
                    ).map(([label]) => (
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
                  {ressources.map((row) => {
                    const categorie = row.categorie ?? row.theme
                    return (
                      <tr
                        key={row.id}
                        style={{ borderBottom: '1px solid var(--gj-line)' }}
                        className="last:border-b-0"
                      >
                        {/* Ressource: badge + titre */}
                        <td className="px-[18px] py-[13px]">
                          <div className="flex items-center gap-[11px]">
                            <TypeBadge type={row.type} />
                            <span
                              className="text-[13.5px] font-black"
                              style={{ color: 'var(--gj-ink)' }}
                            >
                              {row.titre}
                            </span>
                          </div>
                        </td>
                        {/* Catégorie */}
                        <td
                          className="px-[18px] py-[13px] text-[12.5px]"
                          style={{ color: 'var(--gj-grey)' }}
                        >
                          {categorie}
                        </td>
                        {/* Vues */}
                        <td
                          className="px-[18px] py-[13px] text-[13px] font-bold"
                          style={{ color: 'var(--gj-ink)' }}
                        >
                          {formatVues(row.vues)}
                        </td>
                        {/* Statut */}
                        <td className="px-[18px] py-[13px]">
                          <StatutPill estPublic={row.estPublic} />
                        </td>
                        {/* Action */}
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
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile card list */}
            <div className="md:hidden">
              {ressources.map((row) => (
                <RessourceMobileCard key={row.id} row={row} onEdit={openEdit} />
              ))}
            </div>
          </div>
        )}

        {totalPages > 1 && (
          <div className="mt-6 flex justify-center">
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              baseUrl="/admin/ressources"
              ariaLabel="Pagination"
            />
          </div>
        )}
      </div>
      </div>
      <RessourceFormModal
        key={editRow?.id ?? 'new'}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        ressource={editRow}
      />
    </>
  )
}
