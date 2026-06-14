'use client'

/**
 * GUIC-395 — Liste interactive des réservations du jour pour staff centre.
 *
 * Ajoute le bouton "Annuler" sur chaque réservation `Acceptee | EnAttente`.
 * Click → modal de confirmation + textarea raison optionnelle → POST
 * `/api/centre-staff/[centreId]/reservations/[id]/cancel`.
 *
 * Le composant reste volontairement sobre (HTML natif `<dialog>`-like via
 * div role=dialog) pour éviter d'introduire une dépendance modale supplémentaire
 * MVP. À harmoniser avec la primitive `<Modal>` du design system en Sprint+1.
 */

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'

export interface StaffReservationRow {
  id:           string
  creneauDebut: string
  creneauFin:   string
  statut:       string
  motif:        string
  utilisateur:  { nom: string; prenom: string }
  ressource:    { nom: string; type: string }
}

const STATUTS_ANNULABLES = new Set(['Acceptee', 'EnAttente'])

interface Props {
  centreId:     string
  reservations: StaffReservationRow[]
}

export default function ReservationsListClient({ centreId, reservations }: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [target, setTarget] = useState<StaffReservationRow | null>(null)
  const [raison, setRaison] = useState('')
  const [error, setError] = useState<string | null>(null)

  function openCancel(r: StaffReservationRow): void {
    setTarget(r)
    setRaison('')
    setError(null)
  }

  function close(): void {
    setTarget(null)
    setRaison('')
    setError(null)
  }

  async function confirmCancel(): Promise<void> {
    if (!target) return
    setError(null)
    try {
      const res = await fetch(
        `/api/centre-staff/${encodeURIComponent(centreId)}/reservations/${encodeURIComponent(target.id)}/cancel`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify(raison.trim().length > 0 ? { raison: raison.trim() } : {}),
        },
      )
      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        setError(json?.error?.message ?? 'Annulation impossible.')
        return
      }
      close()
      startTransition(() => router.refresh())
    } catch {
      setError('Erreur réseau — réessaye.')
    }
  }

  if (reservations.length === 0) {
    return (
      <p className="text-fs-300 text-color-text-secondary">
        Aucune réservation pour cette date.
      </p>
    )
  }

  return (
    <>
      <ul className="flex flex-col gap-space-2" data-testid="staff-reservations-list">
        {reservations.map((r) => {
          const annulable = STATUTS_ANNULABLES.has(r.statut)
          return (
            <li
              key={r.id}
              className="rounded-gj-lg bg-white p-space-3 shadow-gj-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-2"
            >
              <div className="min-w-0">
                <p className="text-fs-300 font-bold text-color-text-primary truncate">
                  {r.utilisateur.prenom} {r.utilisateur.nom}
                </p>
                <p className="text-fs-200 text-color-text-secondary truncate">
                  {r.ressource.nom} · {r.ressource.type}
                </p>
              </div>
              <div className="flex items-center gap-space-3">
                <span className="text-fs-300 text-color-text-secondary tabular-nums">
                  {r.creneauDebut}–{r.creneauFin}
                </span>
                <span className="text-fs-200 px-space-2 py-space-1 rounded-gj-sm bg-gj-teal-soft text-gj-teal-deep font-bold">
                  {r.statut}
                </span>
                {annulable && (
                  <button
                    type="button"
                    onClick={() => openCancel(r)}
                    className="min-h-[var(--tap-min)] px-space-3 rounded-gj-md border border-gj-red text-gj-red font-bold text-fs-200 hover:bg-gj-red hover:text-white transition"
                    data-testid={`cancel-${r.id}`}
                  >
                    Annuler
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {target !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-space-3"
        >
          <div className="w-full max-w-md rounded-gj-lg bg-white p-space-4 shadow-gj-md flex flex-col gap-space-3">
            <h2 id="cancel-title" className="text-fs-500 font-bold text-color-text-primary">
              Annuler la réservation ?
            </h2>
            <p className="text-fs-300 text-color-text-secondary">
              {target.utilisateur.prenom} {target.utilisateur.nom} · {target.ressource.nom} ·{' '}
              {target.creneauDebut}–{target.creneauFin}
            </p>
            <label className="flex flex-col gap-space-1 text-fs-300">
              <span className="text-color-text-secondary">
                Raison (optionnelle)
              </span>
              <textarea
                value={raison}
                onChange={(e) => setRaison(e.target.value)}
                maxLength={500}
                rows={3}
                className="rounded-gj-md border border-color-border p-space-2 text-fs-300"
                placeholder="Ex. centre fermé exceptionnellement"
                data-testid="cancel-raison"
              />
            </label>
            {error !== null && (
              <p className="text-fs-200 text-gj-red" role="alert">
                {error}
              </p>
            )}
            <div className="flex items-center justify-end gap-space-2">
              <button
                type="button"
                onClick={close}
                disabled={pending}
                className="min-h-[var(--tap-min)] px-space-3 rounded-gj-md border border-color-border font-bold text-fs-300"
              >
                Retour
              </button>
              <button
                type="button"
                onClick={confirmCancel}
                disabled={pending}
                className="min-h-[var(--tap-min)] px-space-3 rounded-gj-md bg-gj-red text-white font-bold text-fs-300 disabled:opacity-60"
                data-testid="cancel-confirm"
              >
                {pending ? 'Annulation...' : 'Confirmer l’annulation'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
