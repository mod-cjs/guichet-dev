'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Skeleton } from '@/components/ui/Skeleton'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import { Region } from '@prisma/client'
import { CentreFormModal } from './CentreFormModal'
import { supprimerCentre } from './actions'
import { CentreCard } from '@/components/ui/CentreCard'

// Grille du tableau desktop : Centre · Jeunes · Agents · Actions.
// (Les colonnes « Insertions/mois » et « Taux d'insertion » ont été retirées :
//  aucune source de données ne les alimentait — elles affichaient « — » partout.)
const GRID = '2fr 1fr 0.7fr 0.9fr'

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
                gridTemplateColumns: GRID,
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
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
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
    startTransition(async () => {
      try {
        await supprimerCentre(centre.id)
        setFeedback({ message: `Centre « ${centre.nom} » supprimé.`, variant: 'success' })
      } catch (e) {
        // C2 — la suppression échoue si des jeunes/agents sont rattachés : on le DIT.
        const msg = e instanceof Error && e.message.includes('CENTRE_NON_VIDE')
          ? `Impossible de supprimer « ${centre.nom} » : des jeunes ou agents y sont rattachés.`
          : `La suppression de « ${centre.nom} » a échoué.`
        setFeedback({ message: msg, variant: 'danger' })
      }
    })
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

        {/* ── Grille de cartes letterhead (GUIC-682) ────────────────────── */}
        {centres.length === 0 ? (
          <div
            aria-label="Liste des centres CJS"
            style={{
              background: 'var(--gj-surface)',
              border: '1.5px solid var(--gj-line)',
              borderRadius: 14,
              padding: '48px 18px',
              textAlign: 'center',
              color: 'var(--gj-grey)',
              fontSize: 14,
            }}
          >
            <Icon name="pin" size={40} style={{ color: 'var(--gj-line-strong)', display: 'block', margin: '0 auto 12px' }} />
            Aucun centre dans le réseau.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[14px]" aria-label="Liste des centres CJS">
            {centres.map((centre) => (
              <CentreCard
                key={centre.id}
                centre={{
                  id: centre.id,
                  nom: centre.nom,
                  region: centre.region,
                  estActif: centre.estActif,
                  jeunes: centre._count.profilsRattaches,
                  agents: centre._count.agents,
                }}
                onEdit={() => openEdit(centre)}
                onDelete={() => handleDelete(centre)}
              />
            ))}
          </div>
        )}

      </div>
    </div>
    <CentreFormModal
      key={editCentre?.id ?? 'new'}
      isOpen={modalOpen}
      onClose={() => setModalOpen(false)}
      centre={editCentre}
      onSuccess={(action) =>
        setFeedback({
          message: action === 'create' ? 'Centre créé.' : 'Centre mis à jour.',
          variant: 'success',
        })
      }
    />
    {feedback && (
      <Toast
        message={feedback.message}
        variant={feedback.variant}
        onClose={() => setFeedback(null)}
      />
    )}
    </>
  )
}
