'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { Icon } from '@/components/ui/Icon'
import { EmptyState } from '@/components/ui/EmptyState'
import { deciderReservation } from './actions'
import type { ReservationAValider, RessourceKind } from '@/lib/loaders/conseiller'

/**
 * GUIC-495 / GUIC-496 — US-3 file des réservations à valider + US-4 accepter/refuser.
 * Rendu fidèle à `design-guichet-v4/agent-web.jsx` : icône ressource, intitulé,
 * « qui · date · créneau », boutons rapides accepter (vert) / refuser (rouge).
 */

const KIND_TONE: Record<RessourceKind, { soft: string; ink: string }> = {
  salle: { soft: 'var(--gj-teal-soft)', ink: 'var(--gj-teal-deep)' },
  vehicule: { soft: 'var(--gj-yellow-soft)', ink: 'var(--gj-yellow-ink)' },
  poste: { soft: 'var(--gj-blue-soft)', ink: 'var(--gj-blue-ink)' },
  atelier: { soft: 'var(--gj-green-soft)', ink: 'var(--gj-green-ink)' },
  equipement: { soft: 'var(--gj-teal-soft)', ink: 'var(--gj-teal-deep)' },
}

function Row({ r }: { r: ReservationAValider }) {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState<null | 'accept' | 'refuse'>(null)
  const [error, setError] = useState<string | null>(null)
  const tone = KIND_TONE[r.kind]

  const decide = (decision: 'accept' | 'refuse') => {
    setError(null)
    startTransition(async () => {
      const res = await deciderReservation(r.id, decision)
      if (res.error) setError(res.error.message)
      else setDone(decision)
    })
  }

  if (done) {
    return (
      <div className="flex items-center gap-space-2 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
        <Icon name={done === 'accept' ? 'check-circle' : 'block'} size={18} style={{ color: done === 'accept' ? 'var(--gj-green)' : 'var(--gj-red)' }} />
        <span className="text-fs-300 text-color-text-secondary">
          {r.ressourceNom} — {done === 'accept' ? 'acceptée' : 'refusée'}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-space-3 py-space-3" style={{ borderBottom: '1px solid var(--gj-line)' }}>
      <span className="inline-flex items-center justify-center rounded-gj-md shrink-0" style={{ width: 38, height: 38, background: tone.soft, color: tone.ink }}>
        <Icon name={r.kindIcon} size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <div className="font-extrabold text-color-text-primary truncate" style={{ fontSize: 13.5 }}>{r.ressourceNom}</div>
        <div className="text-color-text-secondary truncate" style={{ fontSize: 11.5, marginTop: 1 }}>{r.who} · {r.dateLabel} · {r.slot}</div>
        {error && <div className="text-fs-100" style={{ color: 'var(--gj-red)', marginTop: 2 }}>{error}</div>}
      </div>
      <div className="flex gap-space-2 shrink-0">
        <button
          type="button"
          onClick={() => decide('accept')}
          disabled={pending}
          aria-label={`Accepter la réservation ${r.ressourceNom}`}
          className="inline-flex items-center justify-center disabled:opacity-50"
          style={{ width: 34, height: 34, borderRadius: 8, border: 0, background: 'var(--gj-green)', color: '#fff' }}
        >
          <Icon name="check" size={16} />
        </button>
        {/* Refuser = action destructive (notifie le jeune) → passe par l'écran détaillé (motif). */}
        <Link
          href="/conseiller/reservations?tab=attente"
          aria-label={`Refuser la réservation ${r.ressourceNom} (avec motif)`}
          title="Refuser avec un motif"
          className="inline-flex items-center justify-center no-underline"
          style={{ width: 34, height: 34, borderRadius: 8, background: '#fff', color: 'var(--gj-red)', border: '1.5px solid var(--gj-line)' }}
        >
          <Icon name="close" size={16} />
        </Link>
      </div>
    </div>
  )
}

export function ReservationsAValider({ rows }: { rows: ReservationAValider[] }) {
  return (
    <div className="bg-white rounded-gj-lg p-space-5" style={{ border: '1.5px solid var(--gj-line)' }}>
      <div className="flex items-center justify-between mb-space-3">
        <h2 className="font-black text-color-text-primary m-0" style={{ fontSize: 16 }}>Réservations à valider</h2>
        <Link href="/conseiller/reservations" className="no-underline font-extrabold" style={{ color: 'var(--gj-teal-deep)', fontSize: 12.5 }}>
          Tout voir →
        </Link>
      </div>
      {rows.length === 0 ? (
        <EmptyState icon="check-circle" title="Aucune réservation en attente" description="Les nouvelles demandes de ressources apparaîtront ici." />
      ) : (
        <div className="flex flex-col">
          {rows.map((r) => <Row key={r.id} r={r} />)}
        </div>
      )}
    </div>
  )
}
