'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { TypeFormModal, type TypeFormValues } from './TypeFormModal'
import { supprimerType, basculerActifType } from './actions'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TypeRow {
  id: string
  slug: string
  libelle: string
  actionLabel: string
  requiresFileUpload: boolean
  fileLabel: string | null
  decisionAuthority: string | null
  actif: boolean
  ordre: number
  _count: { opportunites: number }
}

interface TypesAdminTableProps {
  types: TypeRow[]
  total: number
}

const GRID = '1.6fr 0.9fr 1.1fr 1fr 0.7fr 0.9fr 0.8fr'

// ─── Main table component ────────────────────────────────────────────────────

export function TypesAdminTable({ types, total }: TypesAdminTableProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editType, setEditType] = useState<TypeFormValues | undefined>(undefined)
  const [, startTransition] = useTransition()

  function openCreate() {
    setEditType(undefined)
    setModalOpen(true)
  }
  function openEdit(t: TypeRow) {
    setEditType(t)
    setModalOpen(true)
  }
  function toggleActif(t: TypeRow) {
    startTransition(() => { void basculerActifType(t.id, !t.actif) })
  }
  function handleDelete(t: TypeRow) {
    if (t._count.opportunites > 0) {
      window.alert(
        `Impossible de supprimer « ${t.libelle} » : ${t._count.opportunites} opportunité(s) y sont rattachées. Désactive-le plutôt pour préserver l’historique.`,
      )
      return
    }
    if (typeof window !== 'undefined' && !window.confirm(`Supprimer le type « ${t.libelle} » ?`)) return
    startTransition(async () => {
      try {
        await supprimerType(t.id)
      } catch {
        window.alert('Suppression refusée (des opportunités sont rattachées à ce type).')
      }
    })
  }

  return (
    <>
      <div style={{ padding: '22px 28px 40px', overflowY: 'auto', flex: 1 }}>
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
              <h1 style={{ fontSize: 24, fontWeight: 900, color: 'var(--gj-ink)', margin: 0 }}>
                Types d’opportunité
              </h1>
              <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3, marginBottom: 0 }}>
                {total.toLocaleString('fr-FR')} types · alimentent les formulaires de publication
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
              aria-label="Nouveau type"
            >
              <Icon name="plus" size={16} />
              Nouveau type
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
            aria-label="Liste des types d’opportunité"
          >
            {/* Header row */}
            <div
              role="row"
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
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
              <span>Type</span>
              <span>Bouton</span>
              <span>Fichier</span>
              <span>Décision</span>
              <span>Opp.</span>
              <span>Statut</span>
              <span>Actions</span>
            </div>

            {/* Empty state */}
            {types.length === 0 && (
              <div style={{ padding: '48px 18px', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>
                <Icon name="target" size={40} style={{ color: 'var(--gj-line-strong)', display: 'block', margin: '0 auto 12px' }} />
                Aucun type d’opportunité défini.
              </div>
            )}

            {/* Data rows */}
            {types.map((t) => (
              <div
                key={t.id}
                role="row"
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID,
                  gap: 14,
                  padding: '13px 18px',
                  borderBottom: '1px solid var(--gj-line)',
                  alignItems: 'center',
                  opacity: t.actif ? 1 : 0.6,
                }}
              >
                {/* Type */}
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--gj-ink)' }}>{t.libelle}</div>
                  <div style={{ fontSize: 11, color: 'var(--gj-grey)', fontFamily: 'monospace' }}>{t.slug}</div>
                </div>
                {/* Bouton */}
                <span style={{ fontSize: 12.5, color: 'var(--gj-ink)' }}>{t.actionLabel}</span>
                {/* Fichier */}
                <span style={{ fontSize: 12, color: t.requiresFileUpload ? 'var(--gj-ink)' : 'var(--gj-grey)' }}>
                  {t.requiresFileUpload ? (t.fileLabel ?? 'Oui') : '—'}
                </span>
                {/* Décision */}
                <span style={{ fontSize: 12, color: 'var(--gj-grey)' }}>{t.decisionAuthority ?? '—'}</span>
                {/* Opportunités */}
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--gj-grey)' }}>
                  {t._count.opportunites}
                </span>
                {/* Statut — toggle */}
                <button
                  type="button"
                  onClick={() => toggleActif(t)}
                  aria-label={t.actif ? `Désactiver ${t.libelle}` : `Activer ${t.libelle}`}
                  aria-pressed={t.actif}
                  style={{
                    justifySelf: 'start',
                    fontSize: 10.5,
                    fontWeight: 800,
                    padding: '3px 10px',
                    borderRadius: 999,
                    border: '1.5px solid var(--gj-line)',
                    cursor: 'pointer',
                    background: t.actif ? 'var(--gj-green-soft)' : 'var(--gj-bg)',
                    color: t.actif ? 'var(--gj-green)' : 'var(--gj-grey)',
                  }}
                >
                  {t.actif ? 'Actif' : 'Inactif'}
                </button>
                {/* Actions */}
                <div style={{ display: 'flex', gap: 6, justifySelf: 'end' }}>
                  <button
                    type="button"
                    aria-label="Modifier"
                    onClick={() => openEdit(t)}
                    style={iconBtn('var(--gj-teal-deep)')}
                  >
                    <Icon name="settings" size={15} />
                  </button>
                  <button
                    type="button"
                    aria-label="Supprimer"
                    onClick={() => handleDelete(t)}
                    style={iconBtn('var(--gj-red)')}
                  >
                    <Icon name="block" size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* ── Mobile card list ─────────────────────────────────────────────── */}
          <div className="md:hidden flex flex-col" style={{ gap: 10, marginTop: 12 }} aria-label="Liste des types (vue mobile)">
            {types.length === 0 && (
              <p style={{ padding: '32px 0', textAlign: 'center', color: 'var(--gj-grey)', fontSize: 14 }}>
                Aucun type d’opportunité défini.
              </p>
            )}
            {types.map((t) => (
              <div
                key={t.id}
                style={{
                  background: 'var(--gj-surface)',
                  border: '1px solid var(--gj-line)',
                  borderRadius: 13,
                  padding: 13,
                  opacity: t.actif ? 1 : 0.6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 11 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)' }}>{t.libelle}</div>
                    <div style={{ fontSize: 11, color: 'var(--gj-grey)' }}>
                      {t.actionLabel} · {t.decisionAuthority ?? '—'} · {t._count.opportunites} opp.
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => openEdit(t)}
                    aria-label={`Modifier ${t.libelle}`}
                    style={iconBtn('var(--gj-teal-deep)')}
                  >
                    <Icon name="settings" size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
      <TypeFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} type={editType} />
    </>
  )
}

function iconBtn(color: string): React.CSSProperties {
  return {
    width: 32,
    height: 32,
    borderRadius: 8,
    border: '1.5px solid var(--gj-line)',
    background: 'var(--gj-surface)',
    color,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
}
