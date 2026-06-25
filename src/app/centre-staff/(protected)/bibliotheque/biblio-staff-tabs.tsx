'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Tabs, Card, Button, Toast, EmptyState, Icon } from '@/components/ui'
import type { EmpruntVue } from '@/lib/bibliotheque/service'

interface Props {
  centreId: string
  aConfirmer: EmpruntVue[]
  aRendre: EmpruntVue[]
}

type TabValue = 'confirmer' | 'rendre'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

const STATUT_LABELS: Record<string, string> = {
  en_cours: 'En cours',
  en_retard: 'En retard',
}

export function BiblioStaffTabs({ aConfirmer, aRendre }: Props) {
  const router = useRouter()
  const [tab, setTab] = useState<TabValue>('confirmer')
  const [loading, setLoading] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'danger' } | null>(null)

  async function handleAction(empruntId: string, endpoint: 'confirmer' | 'retour') {
    if (loading) return
    setLoading(empruntId)
    try {
      const res = await fetch(`/api/bibliotheque/emprunts/${encodeURIComponent(empruntId)}/${endpoint}`, {
        method: 'POST',
        credentials: 'same-origin',
      })
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
    <div className="flex flex-col gap-space-4">
      <Tabs
        value={tab}
        onChange={setTab}
        items={tabItems}
        ariaLabel="Emprunts bibliothèque"
      />

      {tab === 'confirmer' && (
        <div
          id="biblio-panel-confirmer"
          role="tabpanel"
          aria-label="Emprunts à confirmer"
        >
          {aConfirmer.length === 0 ? (
            <EmptyState
              illustration="inbox"
              title="Aucun emprunt à confirmer"
              description="Tous les emprunts initiés ont été traités."
            />
          ) : (
            <ul className="flex flex-col gap-space-3 list-none p-0 m-0">
              {aConfirmer.map((emp) => (
                <li key={emp.id}>
                  <Card variant="default">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3">
                      <div className="flex gap-space-3 flex-1 min-w-0">
                        <div
                          className="flex-shrink-0 w-10 h-12 rounded-gj-sm flex items-center justify-center"
                          style={{ background: 'var(--gj-teal-soft)' }}
                        >
                          <Icon name="resources" size={20} style={{ color: 'var(--gj-teal-deep)' }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-fs-300 font-bold text-color-text-primary line-clamp-2">
                            {emp.livre.titre}
                          </p>
                          <p className="text-fs-200 text-color-text-secondary truncate">
                            {emp.livre.auteur}
                          </p>
                          <p className="text-fs-200 text-color-text-muted mt-space-1">
                            Code-barre : {emp.exemplaire.codeBarre} · Rayon {emp.exemplaire.rayon}
                          </p>
                          <p className="text-fs-200 text-color-text-muted">
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
                        Confirmer (scan badge)
                      </Button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === 'rendre' && (
        <div
          id="biblio-panel-rendre"
          role="tabpanel"
          aria-label="Emprunts à rendre"
        >
          {aRendre.length === 0 ? (
            <EmptyState
              illustration="inbox"
              title="Aucun retour en attente"
              description="Tous les livres empruntés ont été rendus."
            />
          ) : (
            <ul className="flex flex-col gap-space-3 list-none p-0 m-0">
              {aRendre.map((emp) => {
                const isRetard = emp.statut === 'en_retard'
                return (
                  <li key={emp.id}>
                    <Card variant="default" accent={isRetard ? 'red' : 'none'}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-3">
                        <div className="flex gap-space-3 flex-1 min-w-0">
                          <div
                            className="flex-shrink-0 w-10 h-12 rounded-gj-sm flex items-center justify-center"
                            style={{ background: isRetard ? 'var(--gj-red-soft, #fee2e2)' : 'var(--gj-teal-soft)' }}
                          >
                            <Icon
                              name="resources"
                              size={20}
                              style={{ color: isRetard ? 'var(--gj-red)' : 'var(--gj-teal-deep)' }}
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-fs-300 font-bold text-color-text-primary line-clamp-2">
                              {emp.livre.titre}
                            </p>
                            <p className="text-fs-200 text-color-text-secondary truncate">
                              {emp.livre.auteur}
                            </p>
                            <div className="flex flex-wrap gap-space-2 mt-space-1">
                              <span
                                className="text-fs-100 font-bold rounded-gj-pill"
                                style={{
                                  background: isRetard ? 'var(--gj-red-soft, #fee2e2)' : 'var(--gj-teal-soft)',
                                  color: isRetard ? 'var(--gj-red)' : 'var(--gj-teal-deep)',
                                  padding: '2px 10px',
                                }}
                              >
                                {STATUT_LABELS[emp.statut] ?? emp.statut}
                              </span>
                              {emp.dateRetourPrevue && (
                                <span className="text-fs-200 text-color-text-muted flex items-center gap-space-1">
                                  <Icon name="calendar" size={12} />
                                  Retour prévu : {formatDate(emp.dateRetourPrevue)}
                                </span>
                              )}
                            </div>
                            <p className="text-fs-200 text-color-text-muted mt-space-1">
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
                    </Card>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {toast && (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  )
}
