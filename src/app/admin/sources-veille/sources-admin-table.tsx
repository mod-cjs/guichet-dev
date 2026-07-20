'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Pagination } from '@/components/ui/Pagination'
import { SourceFormModal, type SourceFormValues, type TypeOption } from './SourceFormModal'
import { LIBELLES_METHODE, LIBELLES_FREQUENCE } from './libelles'

export interface SourceRow extends SourceFormValues {
  id: string
  nom: string
  url: string
  methode: string
  frequence: string
  actif: boolean
  derniereVerifLe: string | null
}

interface SourcesAdminTableProps {
  sources: SourceRow[]
  types: TypeOption[]
  total: number
  page: number
  totalPages: number
}

const GRID = '1.8fr 1fr 1fr 0.7fr 0.9fr 0.8fr'

/** Extrait un message d'erreur lisible d'une réponse API échouée. */
async function messageErreur(res: Response, fallback: string): Promise<string> {
  const body = (await res.json().catch(() => null)) as { error?: { message?: string } } | null
  return body?.error?.message ?? fallback
}

export function SourcesAdminTable({ sources, types, total, page, totalPages }: SourcesAdminTableProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [editSource, setEditSource] = useState<SourceRow | undefined>(undefined)
  const [, startTransition] = useTransition()

  function openCreate() {
    setEditSource(undefined)
    setModalOpen(true)
  }
  function openEdit(s: SourceRow) {
    setEditSource(s)
    setModalOpen(true)
  }
  function toggleActif(s: SourceRow) {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/sources-veille/${s.id}`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ actif: !s.actif }),
        })
        if (!res.ok) {
          window.alert(await messageErreur(res, 'Impossible de changer le statut — réessaie.'))
          return
        }
      } catch {
        window.alert('Réseau indisponible — le statut n’a pas été changé.')
        return
      }
      router.refresh()
    })
  }
  function handleDelete(s: SourceRow) {
    if (!window.confirm(`Supprimer la source « ${s.nom} » ? Le robot cessera de la surveiller.`))
      return
    startTransition(async () => {
      try {
        const res = await fetch(`/api/admin/sources-veille/${s.id}`, { method: 'DELETE' })
        if (!res.ok) {
          window.alert(await messageErreur(res, 'Suppression impossible — réessaie.'))
          return
        }
      } catch {
        window.alert('Réseau indisponible — la source n’a pas été supprimée.')
        return
      }
      router.refresh()
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
                Sources de veille
              </h1>
              <p style={{ fontSize: 13, color: 'var(--gj-grey)', marginTop: 3, marginBottom: 0 }}>
                {total.toLocaleString('fr-FR')} sources · surveillées par le robot de curation —
                rien n’est publié sans validation
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
              aria-label="Nouvelle source"
            >
              <Icon name="plus" size={16} />
              Nouvelle source
            </Button>
          </div>

          {/* ── Table ──────────────────────────────────────────────────────── */}
          <div
            style={{
              background: 'var(--gj-surface)',
              borderRadius: 14,
              border: '1px solid var(--gj-border)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: GRID,
                gap: 10,
                padding: '10px 16px',
                fontSize: 11.5,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: 0.4,
                color: 'var(--gj-grey)',
                borderBottom: '1px solid var(--gj-border)',
              }}
            >
              <span>Source</span>
              <span>Méthode</span>
              <span>Fréquence</span>
              <span>Statut</span>
              <span>Dernière vérif.</span>
              <span style={{ textAlign: 'right' }}>Actions</span>
            </div>

            {sources.length === 0 && (
              <p style={{ padding: '28px 16px', fontSize: 13.5, color: 'var(--gj-grey)', margin: 0 }}>
                Aucune source déclarée. Ajoute un premier site à surveiller avec « Nouvelle source ».
              </p>
            )}

            {sources.map((s) => (
              <div
                key={s.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: GRID,
                  gap: 10,
                  padding: '12px 16px',
                  alignItems: 'center',
                  borderBottom: '1px solid var(--gj-border)',
                  fontSize: 13.5,
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, color: 'var(--gj-ink)' }}>{s.nom}</div>
                  <div
                    style={{
                      fontSize: 12,
                      color: 'var(--gj-grey)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {s.url}
                  </div>
                </div>
                <span>{LIBELLES_METHODE[s.methode] ?? s.methode}</span>
                <span>{LIBELLES_FREQUENCE[s.frequence] ?? s.frequence}</span>
                <button
                  type="button"
                  onClick={() => toggleActif(s)}
                  aria-label={s.actif ? `Désactiver ${s.nom}` : `Activer ${s.nom}`}
                  style={{
                    minHeight: 'var(--tap-min)',
                    border: 0,
                    background: 'none',
                    cursor: 'pointer',
                    textAlign: 'left',
                    padding: 0,
                    fontWeight: 800,
                    fontSize: 12.5,
                    color: s.actif ? 'var(--gj-teal-deep)' : 'var(--gj-grey)',
                  }}
                >
                  {s.actif ? 'Active' : 'Inactive'}
                </button>
                <span style={{ fontSize: 12.5, color: 'var(--gj-grey)' }}>
                  {s.derniereVerifLe
                    ? new Date(s.derniereVerifLe).toLocaleDateString('fr-FR')
                    : 'Jamais'}
                </span>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4 }}>
                  <Button
                    variant="ghost"
                    onClick={() => openEdit(s)}
                    aria-label={`Modifier ${s.nom}`}
                    style={{ minHeight: 'var(--tap-min)', padding: '8px 10px' }}
                  >
                    <Icon name="settings" size={16} />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => handleDelete(s)}
                    aria-label={`Supprimer ${s.nom}`}
                    style={{ minHeight: 'var(--tap-min)', padding: '8px 10px', color: 'var(--gj-red)' }}
                  >
                    <Icon name="block" size={16} />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div style={{ marginTop: 16 }}>
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                baseUrl="/admin/sources-veille"
                ariaLabel="Pagination des sources de veille"
              />
            </div>
          )}
        </div>
      </div>

      <SourceFormModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false)
          router.refresh()
        }}
        source={editSource}
        types={types}
      />
    </>
  )
}
