'use client'

import { useState } from 'react'
import { Tabs } from '@/components/ui/Tabs'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import type { EmpruntVue } from '@/lib/bibliotheque/service'

// ── Types ─────────────────────────────────────────────────────────────────────
// GUIC-522 — Cluster A : l'admin SUPERVISE les emprunts (lecture seule). Le
// retrait/retour au comptoir reste réservé au staff/conseiller (scan QR au centre) :
// AUCUNE action n'est déclenchée depuis cet écran.

interface Props {
  centreId: string
  /** Emprunts confirmés, non rendus, dans les délais. */
  enCours: EmpruntVue[]
  /** Emprunts confirmés, non rendus, en retard. */
  enRetard: EmpruntVue[]
  /** Emprunts initiés en ligne, pas encore retirés au centre (info seule). */
  reserves: EmpruntVue[]
}

type TabValue = 'retard' | 'encours' | 'reserves'

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  })
}

function formatEmprunteur(emp: EmpruntVue): string | null {
  if (!emp.emprunteur) return null
  return `${emp.emprunteur.prenom} ${emp.emprunteur.nom}`
}

// ── Ligne emprunt (lecture seule) ────────────────────────────────────────────

function EmpruntRow({ emp, retard }: { emp: EmpruntVue; retard: boolean }) {
  const emprunteur = formatEmprunteur(emp)
  return (
    <li>
      <div
        style={{
          background: 'var(--gj-surface)',
          border: retard ? '1.5px solid var(--gj-red)' : '1.5px solid var(--gj-line)',
          borderRadius: 14,
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <div
            style={{
              flexShrink: 0,
              width: 40,
              height: 48,
              borderRadius: 8,
              background: retard ? 'var(--gj-red-soft)' : 'var(--gj-teal-soft)',
              color: retard ? 'var(--gj-red)' : 'var(--gj-teal-deep)',
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

            {/* Emprunteur — info centrale de la supervision (F-09). */}
            {emprunteur && (
              <p
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  color: 'var(--gj-ink)',
                  margin: '6px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 5,
                }}
              >
                <Icon name="users" size={12} style={{ color: 'var(--gj-grey)' }} />
                {emprunteur}
              </p>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginTop: 6 }}>
              {retard && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    borderRadius: 20,
                    padding: '2px 10px',
                    background: 'var(--gj-red-soft)',
                    color: 'var(--gj-red)',
                  }}
                >
                  En retard
                </span>
              )}
              {emp.dateRetourPrevue && (
                <span
                  style={{
                    fontSize: 12,
                    color: retard ? 'var(--gj-red)' : 'var(--gj-grey)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontWeight: retard ? 700 : 400,
                  }}
                >
                  <Icon name="calendar" size={12} />
                  Retour prévu : {formatDate(emp.dateRetourPrevue)}
                </span>
              )}
            </div>
            <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '4px 0 0' }}>
              Code-barre : {emp.exemplaire.codeBarre} · Rayon {emp.exemplaire.rayon}
            </p>
          </div>
        </div>
      </div>
    </li>
  )
}

// ── Ligne réservation (initié, info seule) ───────────────────────────────────

function ReservationRow({ emp }: { emp: EmpruntVue }) {
  const emprunteur = formatEmprunteur(emp)
  return (
    <li>
      <div
        style={{
          background: 'var(--gj-surface)',
          border: '1.5px solid var(--gj-line)',
          borderRadius: 14,
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          <div
            style={{
              flexShrink: 0,
              width: 40,
              height: 48,
              borderRadius: 8,
              background: 'var(--gj-blue-soft)',
              color: 'var(--gj-blue-ink)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon name="resources" size={20} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--gj-ink)', margin: 0 }}>
              {emp.livre.titre}
            </p>
            <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '2px 0 0' }}>
              {emp.livre.auteur}
            </p>
            {emprunteur && (
              <p
                style={{
                  fontSize: 12.5, fontWeight: 700, color: 'var(--gj-ink)', margin: '6px 0 0',
                  display: 'flex', alignItems: 'center', gap: 5,
                }}
              >
                <Icon name="users" size={12} style={{ color: 'var(--gj-grey)' }} />
                {emprunteur}
              </p>
            )}
            <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: '4px 0 0' }}>
              Réservé en ligne le {formatDate(emp.initieA)} — retrait au comptoir en attente.
            </p>
          </div>
        </div>
      </div>
    </li>
  )
}

// ── Composant ─────────────────────────────────────────────────────────────────

export function AdminBiblioEmpruntsClient({ enCours, enRetard, reserves }: Props) {
  const [tab, setTab] = useState<TabValue>(enRetard.length > 0 ? 'retard' : 'encours')

  const tabItems = [
    { value: 'retard' as TabValue, label: 'En retard', count: enRetard.length },
    { value: 'encours' as TabValue, label: 'En cours', count: enCours.length },
    { value: 'reserves' as TabValue, label: 'Réservés', count: reserves.length },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <p style={{ fontSize: 12, color: 'var(--gj-grey)', margin: 0 }}>
        Supervision uniquement — le retrait et le retour se font au comptoir du centre (scan badge par le staff).
      </p>

      <Tabs value={tab} onChange={setTab} items={tabItems} ariaLabel="Emprunts bibliothèque" />

      {/* ── Onglet : En retard ───────────────────────────────────────────── */}
      {tab === 'retard' && (
        <div id="admin-biblio-panel-retard" role="tabpanel" aria-label="Emprunts en retard">
          {enRetard.length === 0 ? (
            <EmptyState
              illustration="inbox"
              title="Aucun retard"
              description="Aucun emprunt n'est en retard dans ce centre."
            />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enRetard.map((emp) => (
                <EmpruntRow key={emp.id} emp={emp} retard />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Onglet : En cours ────────────────────────────────────────────── */}
      {tab === 'encours' && (
        <div id="admin-biblio-panel-encours" role="tabpanel" aria-label="Emprunts en cours">
          {enCours.length === 0 ? (
            <EmptyState
              illustration="inbox"
              title="Aucun emprunt en cours"
              description="Aucun livre n'est actuellement emprunté dans ce centre."
            />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {enCours.map((emp) => (
                <EmpruntRow key={emp.id} emp={emp} retard={false} />
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ── Onglet : Réservés (initié, info) ────────────────────────────── */}
      {tab === 'reserves' && (
        <div id="admin-biblio-panel-reserves" role="tabpanel" aria-label="Réservations en attente de retrait">
          {reserves.length === 0 ? (
            <EmptyState
              illustration="inbox"
              title="Aucune réservation en attente"
              description="Aucun emprunt initié en ligne n'attend d'être retiré au comptoir."
            />
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reserves.map((emp) => (
                <ReservationRow key={emp.id} emp={emp} />
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
