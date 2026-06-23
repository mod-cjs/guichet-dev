'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { regionLabel } from '@/lib/regions'
import { Region } from '@prisma/client'
import { CentreFormModal } from './CentreFormModal'
import { supprimerCentre } from './actions'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CentreRow {
  id: string
  nom: string
  region: Region
  adresse: string
  /** Coordonnées (édition) */
  latitude: number
  longitude: number
  /** Téléphone (édition) */
  telephone: string
  estActif: boolean
  conseillersCount: number
  responsable: string
  ville: string | null
  createdAt: Date
  _count: {
    profilsRattaches: number
    agents: number
  }
}

interface CentresAdminTableProps {
  centres: CentreRow[]
  total: number
}

// ─── Skeleton loading (exported for Suspense fallback) ────────────────────────

export function CentresAdminTableSkeleton() {
  return (
    <div
      style={{
        padding: '22px 28px 40px',
        overflowY: 'auto',
        flex: 1,
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 16,
          }}
        >
          <div>
            <Skeleton height="28px" width="180px" />
            <Skeleton height="16px" width="220px" style={{ marginTop: 8 }} />
          </div>
          <Skeleton height="42px" width="160px" />
        </div>
        <div
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
        >
          {[1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.6fr 1fr 1fr 1.4fr 0.6fr 0.7fr',
                gap: 14,
                padding: '14px 18px',
                borderBottom: '1px solid var(--gj-line)',
                alignItems: 'center',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Skeleton height="34px" width="34px" rounded="9px" />
                <div>
                  <Skeleton height="14px" width="140px" />
                  <Skeleton height="11px" width="80px" style={{ marginTop: 6 }} />
                </div>
              </div>
              <Skeleton height="14px" width="50px" />
              <Skeleton height="14px" width="30px" />
              <Skeleton height="7px" width="110px" rounded="4px" />
              <Skeleton height="14px" width="30px" />
              <div style={{ display: 'flex', gap: 6, justifySelf: 'end' }}>
                <Skeleton height="32px" width="32px" rounded="8px" />
                <Skeleton height="32px" width="32px" rounded="8px" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Main table component ────────────────────────────────────────────────────

export function CentresAdminTable({ centres, total }: CentresAdminTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editCentre, setEditCentre] = useState<CentreRow | undefined>(undefined)
  const [, startTransition] = useTransition()

  function openCreate() {
    setEditCentre(undefined)
    setModalOpen(true)
  }
  function openEdit(centre: CentreRow) {
    setEditCentre(centre)
    setModalOpen(true)
  }
  function handleDelete(centre: CentreRow) {
    if (typeof window !== 'undefined' && !window.confirm(`Supprimer le centre « ${centre.nom} » ?`)) return
    startTransition(() => { void supprimerCentre(centre.id) })
  }

  return (
    <>
    <div
      style={{
        padding: '22px 28px 40px',
        overflowY: 'auto',
        flex: 1,
      }}
    >
      <div style={{ maxWidth: 1040, margin: '0 auto' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'space-between',
            marginBottom: 16,
            flexWrap: 'wrap',
            gap: 12,
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
              Centres CJS
            </h1>
            <p
              style={{
                fontSize: 13,
                color: 'var(--gj-grey)',
                marginTop: 3,
                marginBottom: 0,
              }}
            >
              {total.toLocaleString('fr-FR')} centres du réseau
            </p>
          </div>
          <Button
            variant="primary"
            onClick={openCreate}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 7,
              background: 'var(--gj-teal-deep)',
              color: 'var(--gj-surface)',
              border: 0,
              padding: '11px 18px',
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13.5,
              cursor: 'pointer',
            }}
            aria-label="Ajouter un centre"
          >
            <Icon name="plus" size={16} />
            Ajouter un centre
          </Button>
        </div>

        {/* ── Desktop table ───────────────────────────────────────────────── */}
        <div
          className="hidden md:block"
          style={{
            background: 'var(--gj-surface)',
            border: '1.5px solid var(--gj-line)',
            borderRadius: 14,
            overflow: 'hidden',
          }}
          aria-label="Liste des centres CJS"
        >
          {/* Header row */}
          <div
            role="row"
            aria-rowindex={1}
            style={{
              display: 'grid',
              gridTemplateColumns: '1.6fr 1fr 1fr 1.4fr 0.6fr 0.7fr',
              gap: 14,
              padding: '12px 18px',
              borderBottom: '1.5px solid var(--gj-line)',
              background: 'var(--gj-bg)',
              fontSize: 10.5,
              fontWeight: 800,
              color: 'var(--gj-grey)',
              textTransform: 'uppercase',
              letterSpacing: '.4px',
            }}
          >
            <span>Centre</span>
            <span>Jeunes</span>
            <span>Insertions/mois</span>
            <span>Taux d&apos;insertion</span>
            <span>Agents</span>
            <span>Actions</span>
          </div>

          {/* Empty state */}
          {centres.length === 0 && (
            <div
              style={{
                padding: '48px 18px',
                textAlign: 'center',
                color: 'var(--gj-grey)',
                fontSize: 14,
              }}
            >
              <Icon
                name="pin"
                size={40}
                style={{ color: 'var(--gj-line-strong)', display: 'block', margin: '0 auto 12px' }}
              />
              Aucun centre dans le réseau.
            </div>
          )}

          {/* Data rows */}
          {centres.map((centre) => {
            const jeunes = centre._count.profilsRattaches
            const agents = centre._count.agents
            const label = regionLabel(centre.region) ?? centre.region

            return (
              <div
                key={centre.id}
                role="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1.6fr 1fr 1fr 1.4fr 0.6fr 0.7fr',
                  gap: 14,
                  padding: '13px 18px',
                  borderBottom: '1px solid var(--gj-line)',
                  alignItems: 'center',
                }}
              >
                {/* Centre col */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 9,
                      flexShrink: 0,
                      background: 'var(--gj-teal-soft)',
                      color: 'var(--gj-teal-deep)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="pin" size={16} />
                  </span>
                  <div>
                    <div
                      style={{
                        fontSize: 13.5,
                        fontWeight: 800,
                        color: 'var(--gj-ink)',
                      }}
                    >
                      {centre.nom}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gj-grey)' }}>{label}</div>
                  </div>
                </div>

                {/* Jeunes */}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-ink)' }}>
                  {jeunes.toLocaleString('fr-FR')}
                </span>

                {/* Insertions/mois — pas de champ source */}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-grey)' }}>
                  —
                </span>

                {/* Taux d'insertion — pas de champ source */}
                <span style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--gj-grey)' }}>
                  —
                </span>

                {/* Agents */}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-grey)' }}>
                  {agents}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, justifySelf: 'end' }}>
                  <button
                    type="button"
                    aria-label="Modifier"
                    onClick={() => openEdit(centre)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1.5px solid var(--gj-line)',
                      background: 'var(--gj-surface)',
                      color: 'var(--gj-teal-deep)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="settings" size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Supprimer"
                    onClick={() => handleDelete(centre)}
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      border: '1.5px solid var(--gj-line)',
                      background: 'var(--gj-surface)',
                      color: 'var(--gj-red)',
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="block" size={15} />
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Mobile card list ─────────────────────────────────────────────── */}
        <div
          className="md:hidden"
          style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}
          aria-label="Liste des centres (vue mobile)"
        >
          {centres.length === 0 && (
            <p
              style={{
                padding: '32px 0',
                textAlign: 'center',
                color: 'var(--gj-grey)',
                fontSize: 14,
              }}
            >
              Aucun centre dans le réseau.
            </p>
          )}
          {centres.map((centre) => {
            const jeunes = centre._count.profilsRattaches
            const agents = centre._count.agents
            const label = regionLabel(centre.region) ?? centre.region

            return (
              <div
                key={centre.id}
                style={{
                  background: 'var(--gj-surface)',
                  border: '1px solid var(--gj-line)',
                  borderRadius: 13,
                  padding: 13,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                  <span
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 10,
                      flexShrink: 0,
                      background: 'var(--gj-teal-soft)',
                      color: 'var(--gj-teal-deep)',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <Icon name="pin" size={18} />
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)' }}
                    >
                      {centre.nom}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--gj-grey)' }}>
                      {label} · {jeunes.toLocaleString('fr-FR')} jeunes · {agents} agents
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

      </div>
    </div>
    <CentreFormModal
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      centre={editCentre}
    />
    </>
  )
}
