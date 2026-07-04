'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Icon, type IconName } from '@/components/ui/Icon'
import { Modal } from '@/components/ui/Modal'
import { Textarea } from '@/components/ui/Textarea'
import { EmptyState } from '@/components/ui/EmptyState'
import { deciderReservation, proposerCreneau } from '../actions'
import type {
  ReservationListItem,
  ReservationTab,
  RessourceKind,
  StatutView,
} from '@/lib/loaders/conseiller'

/**
 * GUIC-495 / GUIC-496 — Lignes de réservation + validation.
 * Fidèle à `ResaActionRow` du design v4 : icône ressource, statut, demandeur,
 * méta (date/créneau/personnes/justificatif), motif, et actions accepter
 * (message facultatif) / refuser (motif) via modale.
 */

const KIND_TONE: Record<RessourceKind, { soft: string; ink: string }> = {
  salle: { soft: 'var(--gj-teal-soft)', ink: 'var(--gj-teal-deep)' },
  vehicule: { soft: 'var(--gj-yellow-soft)', ink: 'var(--gj-yellow-ink)' },
  poste: { soft: 'var(--gj-blue-soft)', ink: 'var(--gj-blue-ink)' },
  atelier: { soft: 'var(--gj-green-soft)', ink: 'var(--gj-green-ink)' },
  equipement: { soft: 'var(--gj-teal-soft)', ink: 'var(--gj-teal-deep)' },
}

const STATUT_TONE: Record<StatutView, { soft: string; ink: string; icon: IconName }> = {
  attente: { soft: 'var(--gj-yellow-soft)', ink: 'var(--gj-yellow-ink)', icon: 'clock' },
  acceptee: { soft: 'var(--gj-green-soft)', ink: 'var(--gj-green-ink)', icon: 'check-circle' },
  refusee: { soft: 'var(--gj-red-soft)', ink: 'var(--gj-red-ink)', icon: 'block' },
  annulee: { soft: 'var(--gj-bg)', ink: 'var(--gj-grey)', icon: 'close' },
  passee: { soft: 'var(--gj-bg)', ink: 'var(--gj-grey)', icon: 'clock' },
  nonhonoree: { soft: 'var(--gj-red-soft)', ink: 'var(--gj-red-ink)', icon: 'alert' },
}

function Meta({ icon, children, color }: { icon: IconName; children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center gap-space-1" style={{ fontSize: 11.5, color: color ?? 'var(--gj-grey)', fontWeight: 600 }}>
      <Icon name={icon} size={14} /> {children}
    </span>
  )
}

function Avatar({ initials }: { initials: string }) {
  return (
    <span className="inline-flex items-center justify-center shrink-0" style={{ width: 24, height: 24, borderRadius: '50%', background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', fontWeight: 900, fontSize: 10 }}>
      {initials}
    </span>
  )
}

function DecisionModal({
  row,
  decision,
  onClose,
  onDone,
}: {
  row: ReservationListItem
  decision: 'accept' | 'refuse'
  onClose: () => void
  onDone: () => void
}) {
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const accept = decision === 'accept'

  const confirm = () => {
    setError(null)
    startTransition(async () => {
      const res = await deciderReservation(row.id, decision, note)
      if (res.error) setError(res.error.message)
      else onDone()
    })
  }

  return (
    <Modal isOpen onClose={onClose} title={accept ? 'Accepter la réservation' : 'Refuser la réservation'}>
      <div className="flex flex-col gap-space-4">
        <p className="text-fs-200 text-color-text-secondary m-0">
          {row.ressourceNom} · {row.who} · {row.dateLabel} · {row.slot}
        </p>
        <Textarea
          label={accept ? 'Message au bénéficiaire (facultatif)' : 'Motif du refus'}
          rows={3}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={accept ? 'Ex. Présente ta carte CJS à l’accueil.' : 'Ex. Salle déjà réservée sur ce créneau.'}
        />
        <div className="flex items-center gap-space-2" style={{ background: accept ? 'var(--gj-green-soft)' : 'var(--gj-yellow-soft)', color: accept ? 'var(--gj-green-ink)' : 'var(--gj-yellow-ink)', borderRadius: 9, padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>
          <Icon name="chat" size={14} /> Le bénéficiaire sera notifié dans l’app.
        </div>
        {error && <p className="text-fs-200 m-0" style={{ color: 'var(--gj-red)' }}>{error}</p>}
        <div className="flex justify-end gap-space-2">
          <button type="button" onClick={onClose} disabled={pending} className="font-extrabold" style={{ background: '#fff', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)', padding: '11px 18px', borderRadius: 9, fontSize: 13.5 }}>
            Annuler
          </button>
          <button type="button" onClick={confirm} disabled={pending} className="inline-flex items-center gap-space-2 font-extrabold disabled:opacity-60" style={{ background: accept ? 'var(--gj-green)' : 'var(--gj-red)', color: '#fff', border: 0, padding: '11px 22px', borderRadius: 9, fontSize: 13.5 }}>
            <Icon name={accept ? 'check' : 'close'} size={16} />
            {accept ? "Confirmer l'acceptation" : 'Confirmer le refus'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function ProposeModal({ row, onClose, onDone }: { row: ReservationListItem; onClose: () => void; onDone: () => void }) {
  const [date, setDate] = useState('')
  const [debut, setDebut] = useState('')
  const [fin, setFin] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const valid = /^\d{4}-\d{2}-\d{2}$/.test(date) && /^\d{2}:\d{2}$/.test(debut) && /^\d{2}:\d{2}$/.test(fin) && fin > debut

  const confirm = () => {
    if (!valid) { setError('Renseigne une date et un créneau valides (fin après début).'); return }
    setError(null)
    startTransition(async () => {
      const res = await proposerCreneau(row.id, date, debut, fin, message)
      if (res.error) setError(res.error.message)
      else onDone()
    })
  }

  const field: React.CSSProperties = { border: '1.5px solid var(--gj-line)', borderRadius: 9, padding: '10px 12px', fontSize: 13.5, color: 'var(--gj-ink)', background: 'var(--gj-bg)', outline: 'none', width: '100%', fontFamily: 'inherit' }

  return (
    <Modal isOpen onClose={onClose} title="Proposer un créneau">
      <div className="flex flex-col gap-space-4">
        <p className="text-fs-200 text-color-text-secondary m-0">
          {row.ressourceNom} · {row.who} — créneau demandé : {row.dateLabel} · {row.slot}
        </p>
        <label className="flex flex-col gap-space-1">
          <span className="font-extrabold" style={{ fontSize: 11, color: 'var(--gj-ink)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Date proposée</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} style={field} aria-label="Date proposée" />
        </label>
        <div className="flex gap-space-3">
          <label className="flex flex-col gap-space-1 flex-1">
            <span className="font-extrabold" style={{ fontSize: 11, color: 'var(--gj-ink)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Début</span>
            <input type="time" value={debut} onChange={(e) => setDebut(e.target.value)} style={field} aria-label="Heure de début" />
          </label>
          <label className="flex flex-col gap-space-1 flex-1">
            <span className="font-extrabold" style={{ fontSize: 11, color: 'var(--gj-ink)', textTransform: 'uppercase', letterSpacing: '.4px' }}>Fin</span>
            <input type="time" value={fin} onChange={(e) => setFin(e.target.value)} style={field} aria-label="Heure de fin" />
          </label>
        </div>
        <Textarea label="Message (facultatif)" rows={2} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Ex. La salle est libre à ce créneau." />
        <div className="flex items-center gap-space-2" style={{ background: 'var(--gj-teal-soft)', color: 'var(--gj-teal-deep)', borderRadius: 9, padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>
          <Icon name="info" size={14} /> La demande initiale sera refusée et le bénéficiaire notifié du nouveau créneau.
        </div>
        {error && <p className="text-fs-200 m-0" style={{ color: 'var(--gj-red)' }}>{error}</p>}
        <div className="flex justify-end gap-space-2">
          <button type="button" onClick={onClose} disabled={pending} className="font-extrabold" style={{ background: '#fff', color: 'var(--gj-grey)', border: '1.5px solid var(--gj-line)', padding: '11px 18px', borderRadius: 9, fontSize: 13.5 }}>Annuler</button>
          <button type="button" onClick={confirm} disabled={pending} className="inline-flex items-center gap-space-2 font-extrabold disabled:opacity-60" style={{ background: 'var(--gj-teal-deep)', color: '#fff', border: 0, padding: '11px 22px', borderRadius: 9, fontSize: 13.5 }}>
            <Icon name="calendar" size={16} /> Proposer
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Row({ r }: { r: ReservationListItem }) {
  const [modal, setModal] = useState<null | 'accept' | 'refuse' | 'propose'>(null)
  const router = useRouter()
  const kt = KIND_TONE[r.kind]
  const st = STATUT_TONE[r.statutView]

  return (
    <div className="bg-white rounded-gj-lg p-space-4 flex flex-col gap-space-3" style={{ border: '1.5px solid var(--gj-line)' }}>
      <div className="flex gap-space-3 items-start">
        <span className="inline-flex items-center justify-center shrink-0" style={{ width: 46, height: 46, borderRadius: 11, background: kt.soft, color: kt.ink }}>
          <Icon name={r.kindIcon} size={22} />
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-space-2 justify-between">
            <span className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 15 }}>{r.ressourceNom}</span>
            <span className="inline-flex items-center gap-space-1 shrink-0 font-extrabold" style={{ fontSize: 11, background: st.soft, color: st.ink, padding: '3px 9px', borderRadius: 999 }}>
              <Icon name={st.icon} size={12} /> {r.statutLabel}
            </span>
          </div>
          <div className="flex items-center gap-space-2" style={{ marginTop: 6 }}>
            <Avatar initials={r.initials} />
            <span className="font-bold text-color-text-primary" style={{ fontSize: 12.5 }}>{r.who}</span>
            <span className="text-color-text-secondary" style={{ fontSize: 11.5 }}>· demandé {r.asked}</span>
          </div>
          <div className="flex gap-space-4 flex-wrap" style={{ marginTop: 9 }}>
            <Meta icon="calendar">{r.dateLabel}</Meta>
            <Meta icon="clock">{r.slot}</Meta>
            <Meta icon="users">{r.people} pers.</Meta>
            {r.justif && (r.justifUrl ? (
              <a href={r.justifUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-space-1 no-underline" style={{ fontSize: 11.5, color: 'var(--gj-blue-ink)', fontWeight: 700 }}>
                <Icon name="document" size={14} /> Voir le justificatif
              </a>
            ) : (
              <Meta icon="document" color="var(--gj-blue-ink)">Justificatif joint</Meta>
            ))}
          </div>
          {r.motif && <div className="text-color-text-secondary" style={{ fontSize: 12.5, marginTop: 8, fontStyle: 'italic' }}>« {r.motif} »</div>}
        </div>
      </div>

      {r.note && (
        <div className="flex items-start gap-space-2" style={{ background: st.soft, color: st.ink, borderRadius: 9, padding: '10px 12px', fontSize: 12, fontWeight: 600 }}>
          <Icon name={st.icon} size={14} /> {r.note}
        </div>
      )}

      {r.statutView === 'attente' && (
        <div className="flex gap-space-2 flex-wrap" style={{ borderTop: '1px solid var(--gj-line)', paddingTop: 13 }}>
          <button type="button" onClick={() => setModal('accept')} className="inline-flex items-center gap-space-2 font-extrabold" style={{ background: 'var(--gj-green)', color: '#fff', border: 0, padding: '10px 18px', borderRadius: 9, fontSize: 13 }}>
            <Icon name="check" size={15} /> Accepter
          </button>
          <button type="button" onClick={() => setModal('propose')} className="inline-flex items-center gap-space-2 font-extrabold" style={{ background: '#fff', color: 'var(--gj-teal-deep)', border: '1.5px solid var(--gj-line)', padding: '10px 16px', borderRadius: 9, fontSize: 13 }}>
            <Icon name="calendar" size={15} /> Proposer un créneau
          </button>
          <button type="button" onClick={() => setModal('refuse')} className="inline-flex items-center gap-space-2 font-extrabold" style={{ background: '#fff', color: 'var(--gj-red)', border: '1.5px solid var(--gj-line)', padding: '10px 16px', borderRadius: 9, fontSize: 13 }}>
            <Icon name="close" size={15} /> Refuser
          </button>
        </div>
      )}

      {(modal === 'accept' || modal === 'refuse') && (
        <DecisionModal
          row={r}
          decision={modal}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null)
            router.refresh()
          }}
        />
      )}
      {modal === 'propose' && (
        <ProposeModal
          row={r}
          onClose={() => setModal(null)}
          onDone={() => {
            setModal(null)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}

const EMPTY: Record<ReservationTab, { title: string; description: string }> = {
  all: { title: 'Aucune réservation', description: 'Les demandes de ressources du centre apparaîtront ici.' },
  attente: { title: 'Aucune réservation à valider', description: 'Vous êtes à jour : aucune demande en attente.' },
  acceptee: { title: 'Aucune réservation acceptée', description: 'Les demandes que vous acceptez apparaîtront ici.' },
  refusee: { title: 'Aucune réservation refusée', description: 'Les demandes refusées apparaîtront ici.' },
}

export function ReservationsListe({ rows, tab }: { rows: ReservationListItem[]; tab: ReservationTab }) {
  if (rows.length === 0) {
    return <EmptyState icon="calendar" title={EMPTY[tab].title} description={EMPTY[tab].description} />
  }
  return (
    <div className="flex flex-col gap-space-3">
      {rows.map((r) => <Row key={r.id} r={r} />)}
    </div>
  )
}
