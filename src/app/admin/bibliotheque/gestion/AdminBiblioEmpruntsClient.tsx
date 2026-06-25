'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs } from '@/components/ui/Tabs'
import { Button } from '@/components/ui/Button'
import { Toast } from '@/components/ui/Toast'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import type { EmpruntVue } from '@/lib/bibliotheque/service'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Props {
  centreId: string
  aConfirmer: EmpruntVue[]
  aRendre: EmpruntVue[]
}

type TabValue = 'confirmer' | 'rendre'

type ToastState = { message: string; variant: 'success' | 'danger' } | null

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function AdminBiblioEmpruntsClient({ aConfirmer, aRendre }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabValue>('confirmer')
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<ToastState>(null)

  async function handleAction(empruntId: string, endpoint: 'confirmer' | 'retour') {
    if (loading) return
    setLoading(empruntId)
    try {
      const res = await fetch(
        `/api/admin/bibliotheque/emprunts/${encodeURIComponent(empruntId)}/${endpoint}`,
        { method: 'POST', credentials: 'same-origin' },
      )
      const json = (await res.json()) as { error?: string }
      if (!res.ok) {
        setToast({ message: json.error ?? 'Une erreur est survenue.', variant: 'danger' })
        return
      }
      const label = endpoint === 'confirmer' ? 'Emprunt confirmé.' : 'Retour enregistré.'
      setToast({ message: label, variant: 'success' })
      router.refresh()
    } catch {
      setToast({ message: 'Impossible de contacter le serveur.', variant: 'danger' })
    } finally {
      setLoading(null)
    }
  }

  const tabItems = [
    { value: 'confirmer' as TabValue, label: 'À confirmer', count: aConfirmer.length },
    { value: 'rendre' as TabValue, label: 'À rendre', count: aRendre.length },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <Tabs value={tab} onChange={setTab} items={tabItems} ariaLabel="Emprunts bibliothèque" />

      {/* ── Onglet : À confirmer ─────────────────────────────────────────── */}
      {tab === 'confirmer' && (
        <div id="admin-biblio-panel-confirmer" role="tabpanel" aria-label="Emprunts à confirmer">
          {aConfirmer.length === 0 ? (
            <EmptyState
              illustration="inbox"
              title="Aucun emprunt à confirmer"
              description="Tous les emprunts initiés ont été traités."
            />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aConfirmer.map((emp) => (
                <li key={emp.id}>
                  <div
                    style={{
                      background: 'var(--gj-surface)',
                      border: '1.5px solid var(--gj-line)',
                      borderRadius: 14,
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            flexShrink: 0,
                            width: 40,
                            height: 48,
                            borderRadius: 8,
                            background: 'var(--gj-teal-soft)',
                            color: 'var(--gj-teal-deep)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Icon name="resources" size={20} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p
                            style={{
                              fontSize: 14,
                              fontWeight: 800,
                              color: 'var(--gj-ink)',
                              margin: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {emp.livre.titre}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '2px 0 0' }}>
                            {emp.livre.auteur}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '4px 0 0' }}>
                            Code-barre : {emp.exemplaire.codeBarre} · Rayon {emp.exemplaire.rayon}
                          </p>
                          <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '2px 0 0' }}>
                            Initié le {formatDate(emp.initieA)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="primary"
                        size="sm"
                        loading={loading === emp.id}
                        disabled={loading !== null}
                        onClick={() => void handleAction(emp.id, 'confirmer')}
                      >
                        Confirmer
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Onglet : À rendre ────────────────────────────────────────────── */}
      {tab === 'rendre' && (
        <div id="admin-biblio-panel-rendre" role="tabpanel" aria-label="Emprunts à rendre">
          {aRendre.length === 0 ? (
            <EmptyState
              illustration="inbox"
              title="Aucun retour en attente"
              description="Tous les livres empruntés ont été rendus."
            />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {aRendre.map((emp) => {
                const isRetard = emp.statut === 'en_retard'
                return (
                  <li key={emp.id}>
                    <div
                      style={{
                        background: 'var(--gj-surface)',
                        border: isRetard
                          ? '1.5px solid var(--gj-red, #ef4444)'
                          : '1.5px solid var(--gj-line)',
                        borderRadius: 14,
                        padding: '14px 16px',
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          flexWrap: 'wrap',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 12,
                        }}
                      >
                        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              flexShrink: 0,
                              width: 40,
                              height: 48,
                              borderRadius: 8,
                              background: isRetard ? 'var(--gj-red-soft, #fee2e2)' : 'var(--gj-teal-soft)',
                              color: isRetard ? 'var(--gj-red, #ef4444)' : 'var(--gj-teal-deep)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Icon name="resources" size={20} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p
                              style={{
                                fontSize: 14,
                                fontWeight: 800,
                                color: 'var(--gj-ink)',
                                margin: 0,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {emp.livre.titre}
                            </p>
                            <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '2px 0 0' }}>
                              {emp.livre.auteur}
                            </p>
                            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 }}>
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 20,
                                  padding: '2px 10px',
                                  background: isRetard
                                    ? 'var(--gj-red-soft, #fee2e2)'
                                    : 'var(--gj-yellow-soft, #fef9c3)',
                                  color: isRetard
                                    ? 'var(--gj-red, #ef4444)'
                                    : 'var(--gj-yellow-ink, #92400e)',
                                }}
                              >
                                {isRetard ? 'En retard' : 'En cours'}
                              </span>
                              {emp.dateRetourPrevue && (
                                <span
                                  style={{
                                    fontSize: 12,
                                    color: isRetard ? 'var(--gj-red, #ef4444)' : 'var(--gj-grey)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 4,
                                    fontWeight: isRetard ? 700 : 400,
                                  }}
                                >
                                  <Icon name="calendar" size={12} />
                                  Retour prévu : {formatDate(emp.dateRetourPrevue)}
                                </span>
                              )}
                            </div>
                            <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '4px 0 0' }}>
                              Code-barre : {emp.exemplaire.codeBarre}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant={isRetard ? 'danger' : 'ghost'}
                          size="sm"
                          loading={loading === emp.id}
                          disabled={loading !== null}
                          onClick={() => void handleAction(emp.id, 'retour')}
                        >
                          Enregistrer le retour
                        </Button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast message={toast.message} variant={toast.variant} onClose={() => setToast(null)} />
      )}
    </div>
  )
}
