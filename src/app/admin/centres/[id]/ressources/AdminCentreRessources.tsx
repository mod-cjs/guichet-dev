'use client'

import { useState, useTransition, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/ui/Icon'
import { Toast, type ToastVariant } from '@/components/ui/Toast'
import type { TypeRessourceCentre } from '@prisma/client'
import { basculerActiveRessourceCentre, supprimerRessourceCentre } from '../../ressources-actions'
import { RessourceCentreFormModal, type RessourceCentreValues } from '../../RessourceCentreFormModal'

export interface RessourceCentreItem {
  id: string
  type: TypeRessourceCentre
  nom: string
  description: string | null
  capacite: number
  capaciteUnit: string | null
  dureeMinCreneauMin: number
  requiresJustif: boolean
  estActive: boolean
  reservationsCount: number
}

export interface ReservationRow {
  id: string
  jeune: string
  ressource: string
  date: string
  creneau: string
  statut: string
  passee: boolean
}

export interface AdminCentreRessourcesProps {
  centreId: string
  items: RessourceCentreItem[]
  reservations?: ReservationRow[]
}

// Vue de statut réservation (fidèle maquette : ton + libellé). « Passée » = dérivé (date passée).
const STATUT_VIEW: Record<string, { label: string; bg: string; fg: string }> = {
  EnAttente: { label: 'En attente', bg: 'var(--gj-yellow-soft)', fg: 'var(--gj-yellow-ink)' },
  Acceptee: { label: 'Acceptée', bg: 'var(--gj-green-soft)', fg: 'var(--gj-green-ink)' },
  Refusee: { label: 'Refusée', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
  AnnuleeParJeune: { label: 'Annulée (jeune)', bg: 'var(--gj-line)', fg: 'var(--gj-grey)' },
  AnnuleeParCentre: { label: 'Annulée (centre)', bg: 'var(--gj-line)', fg: 'var(--gj-grey)' },
  Passee: { label: 'Passée', bg: 'var(--gj-line)', fg: 'var(--gj-grey)' },
  NonHonoree: { label: 'Non honorée', bg: 'var(--gj-red-soft)', fg: 'var(--gj-red-ink)' },
}
const RESA_FILTERS: { value: string; label: string }[] = [
  { value: 'all', label: 'Toutes' },
  { value: 'EnAttente', label: 'En attente' },
  { value: 'Acceptee', label: 'Acceptées' },
  { value: 'Refusee', label: 'Refusées' },
  { value: 'Passee', label: 'Passées' },
]

const TYPE_LABEL: Record<TypeRessourceCentre, string> = {
  Salle: 'Salle',
  Vehicule: 'Véhicule',
  Poste_info: 'Poste info',
  Equipement: 'Équipement',
  Atelier_recurrent: 'Atelier récurrent',
}

function Row({ item, onEdit, onResult }: {
  item: RessourceCentreItem
  onEdit: (r: RessourceCentreValues) => void
  onResult: (m: string, v: ToastVariant) => void
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  function run(fn: () => Promise<unknown>, ok: string, confirmMsg?: string) {
    if (confirmMsg && !window.confirm(confirmMsg)) return
    startTransition(async () => {
      try {
        await fn()
        onResult(ok, 'success')
        router.refresh()
      } catch (e) {
        const msg = e instanceof Error ? e.message : ''
        onResult(msg === 'RESSOURCE_NON_VIDE' ? 'Impossible : des réservations existent. Désactive-la plutôt.' : 'Action impossible.', 'danger')
      }
    })
  }

  const active = item.estActive
  const mini: CSSProperties = { width: 34, height: 34, borderRadius: 8, border: '1px solid var(--gj-line)', background: 'transparent', color: 'var(--gj-grey)', display: 'grid', placeItems: 'center', cursor: 'pointer', flexShrink: 0 }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto auto', gap: 13, alignItems: 'center', background: 'var(--gj-surface)', border: '1px solid var(--gj-line)', borderRadius: 11, padding: '11px 14px' }}>
      <span aria-hidden style={{ width: 38, height: 38, borderRadius: 9, display: 'grid', placeItems: 'center', background: 'var(--gj-bg)', color: 'var(--gj-yellow-ink)', flexShrink: 0, fontWeight: 900, fontSize: 15 }}>{TYPE_LABEL[item.type].charAt(0)}</span>
      <div style={{ minWidth: 0 }}>
        <b style={{ fontSize: 13.5, color: 'var(--gj-ink)', display: 'block' }}>{item.nom}</b>
        <div style={{ fontSize: 11.5, color: 'var(--gj-grey)' }}>
          {TYPE_LABEL[item.type]} · {item.capacite}{item.capaciteUnit ? ` ${item.capaciteUnit}` : ' place(s)'} · créneau {item.dureeMinCreneauMin} min{item.requiresJustif ? ' · justificatif requis' : ''}
        </div>
      </div>
      <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: active ? 'var(--gj-green-soft)' : 'var(--gj-line)', color: active ? 'var(--gj-green-ink)' : 'var(--gj-grey)' }}>{active ? 'Active' : 'Inactive'}</span>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <button type="button" aria-label="Éditer" onClick={() => onEdit(item)} style={mini}><Icon name="settings" size={14} /></button>
        <button
          type="button" role="switch" aria-checked={active} aria-label={active ? 'Désactiver' : 'Activer'} disabled={pending}
          onClick={() => run(() => basculerActiveRessourceCentre(item.id, !active), active ? `« ${item.nom} » désactivée.` : `« ${item.nom} » activée.`)}
          style={{ width: 40, height: 22, borderRadius: 999, border: 0, position: 'relative', cursor: 'pointer', flexShrink: 0, transition: 'background .15s', background: active ? 'var(--gj-admin-gold)' : 'var(--gj-line-strong)', opacity: pending ? 0.6 : 1 }}
        >
          <span aria-hidden style={{ position: 'absolute', top: 2, left: active ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: 'var(--color-text-on-dark)', transition: 'left .15s' }} />
        </button>
        <button type="button" aria-label="Supprimer" disabled={pending} onClick={() => run(() => supprimerRessourceCentre(item.id), `« ${item.nom} » supprimée.`, `Supprimer « ${item.nom} » ?`)} style={{ ...mini, color: 'var(--gj-red-ink)', borderColor: 'var(--gj-red)' }}><Icon name="close" size={14} /></button>
      </div>
    </div>
  )
}

const FIELD_SEARCH = 'rounded-[9px] border border-[color:var(--gj-line-strong)] bg-[var(--gj-bg)] px-3 py-[8px] text-[13px] text-color-text-primary font-[inherit] outline-none focus:border-[color:var(--gj-admin-gold)] w-full max-w-[240px]'

/** AdminCentreRessources (GUIC-473) — CRUD des ressources réservables d'un centre. */
export function AdminCentreRessources({ centreId, items, reservations = [] }: AdminCentreRessourcesProps) {
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<RessourceCentreValues | undefined>(undefined)
  const [feedback, setFeedback] = useState<{ message: string; variant: ToastVariant } | null>(null)
  const [rzFilter, setRzFilter] = useState('all')
  const [rzSearch, setRzSearch] = useState('')

  function openCreate() { setEditing(undefined); setModalOpen(true) }
  function openEdit(r: RessourceCentreValues) { setEditing(r); setModalOpen(true) }

  const rzView = reservations.filter((r) => {
    if (rzFilter === 'Passee' && !r.passee) return false
    if (rzFilter !== 'all' && rzFilter !== 'Passee' && r.statut !== rzFilter) return false
    const q = rzSearch.trim().toLowerCase()
    return q === '' || r.jeune.toLowerCase().includes(q)
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <h6 style={{ margin: 0, paddingBottom: 9, borderBottom: '1px solid var(--gj-line)', fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center', gap: 9, flex: 1 }}>
            <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flexShrink: 0 }} />
            Ressources réservables · {items.length}
          </h6>
          <button type="button" onClick={openCreate} style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 14px', borderRadius: 9, fontSize: 12.5, fontWeight: 800, cursor: 'pointer', background: 'transparent', color: 'var(--gj-ink)', border: '1px solid var(--gj-line-strong)' }}>
            <Icon name="plus" size={15} /> Ajouter une ressource
          </button>
        </div>

        {items.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucune ressource réservable pour ce centre.</p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {items.map((item) => <Row key={item.id} item={item} onEdit={openEdit} onResult={(m, v) => setFeedback({ message: m, variant: v })} />)}
          </div>
        )}
      </div>

      {/* Sous-section Réservations (fidèle maquette : recherche + chips + table) */}
      <div style={{ background: 'var(--gj-surface)', border: '1.5px solid var(--gj-line)', borderRadius: 14, boxShadow: 'var(--gj-edge)', padding: 18 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
          <h6 style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: '.09em', textTransform: 'uppercase', color: 'var(--gj-grey)', display: 'inline-flex', alignItems: 'center', gap: 9 }}>
            <span aria-hidden style={{ width: 3, height: 12, borderRadius: 2, background: 'var(--gj-admin-gold)', flexShrink: 0 }} />
            Réservations
          </h6>
          <input className={FIELD_SEARCH} placeholder="Rechercher un jeune…" aria-label="Rechercher un jeune" value={rzSearch} onChange={(e) => setRzSearch(e.target.value)} />
        </div>

        <div role="tablist" aria-label="Filtrer les réservations" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {RESA_FILTERS.map((f) => {
            const on = rzFilter === f.value
            return (
              <button key={f.value} type="button" role="tab" aria-selected={on} onClick={() => setRzFilter(f.value)}
                style={{ fontSize: 12, fontWeight: 700, padding: '6px 12px', borderRadius: 999, cursor: 'pointer', border: on ? '1px solid transparent' : '1px solid var(--gj-line)', background: on ? 'var(--gj-admin-gold)' : 'transparent', color: on ? 'var(--gj-admin-on-gold)' : 'var(--gj-grey)' }}>
                {f.label}
              </button>
            )
          })}
        </div>

        {rzView.length === 0 ? (
          <p style={{ fontSize: 13, color: 'var(--gj-grey)', margin: 0 }}>Aucune réservation{reservations.length ? ' pour ce filtre' : ' pour ce centre'}.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 640, fontSize: 13 }}>
              <thead>
                <tr>
                  {['Jeune', 'Ressource', 'Date · créneau', 'Statut'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 10, fontWeight: 800, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--gj-grey)', padding: '0 12px 10px', borderBottom: '1px solid var(--gj-line)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rzView.map((r) => {
                  const view = (r.passee && r.statut !== 'EnAttente') ? STATUT_VIEW.Passee : (STATUT_VIEW[r.statut] ?? STATUT_VIEW.Passee)
                  return (
                    <tr key={r.id}>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--gj-line)', color: 'var(--gj-ink)', fontWeight: 700 }}>{r.jeune}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--gj-line)', color: 'var(--gj-grey)' }}>{r.ressource}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--gj-line)', color: 'var(--gj-grey)' }}>{r.date} · {r.creneau}</td>
                      <td style={{ padding: 12, borderBottom: '1px solid var(--gj-line)' }}>
                        <span style={{ fontSize: 10.5, fontWeight: 800, padding: '3px 10px', borderRadius: 999, whiteSpace: 'nowrap', background: view.bg, color: view.fg }}>{view.label}</span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RessourceCentreFormModal isOpen={modalOpen} onClose={() => setModalOpen(false)} centreId={centreId} ressource={editing} />
      {feedback && <Toast message={feedback.message} variant={feedback.variant} onClose={() => setFeedback(null)} />}
    </div>
  )
}
