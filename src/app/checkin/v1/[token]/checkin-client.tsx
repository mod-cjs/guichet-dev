'use client'

/**
 * GUIC-387 / GUIC-389 — `<CheckInClient />` formulaire staff MVP.
 *
 * GUIC-389 : on ne demande plus email + mot de passe au formulaire —
 * l'auth se fait au préalable via cookie `centre_staff_session` posé
 * par `/centre-staff/login`. Le serveur (`POST /api/v1/checkin/[token]`)
 * utilise `staff.email` du cookie comme conseillerEmail.
 *
 * - En-tête + identité jeune masquée
 * - Liste des réservations du jour (du jeune, dans le centre du staff)
 * - Sélection centre (en pratique 1 seul = celui du staff)
 * - POST `/api/v1/checkin/[token]`
 */

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export interface CheckInJeune {
  nom:          string
  prenom:       string
  cjsUidMasked: string
}

export interface CheckInReservation {
  id:            string
  centreId:      string
  centreNom:     string
  creneauDebut:  string
  creneauFin:    string
  ressourceNom:  string
  ressourceType: string
}

export interface CheckInCentreOption {
  id:    string
  label: string
}

/** GUIC-474 — cours/session en cours au centre, pour marquer la présence par badge. */
export interface CheckInEvenement {
  id:    string
  titre: string
  type:  string
}

interface Props {
  token:         string
  jeune:         CheckInJeune
  reservations:  CheckInReservation[]
  centres:       CheckInCentreOption[]
  evenements?:   CheckInEvenement[]
}

type Status =
  | { kind: 'idle' }
  | { kind: 'submitting' }
  | { kind: 'success'; message: string }
  | { kind: 'error'; message: string }

function initials(prenom: string, nom: string): string {
  return `${(prenom?.[0] ?? '').toUpperCase()}${(nom?.[0] ?? '').toUpperCase()}`
}

export function CheckInClient({ token, jeune, reservations, centres, evenements = [] }: Props) {
  const [centreId, setCentreId] = useState<string>(() => centres[0]?.id ?? '')
  const [selectedResa, setSelectedResa] = useState<string | null>(null)
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  // GUIC-474 — marque la présence du jeune à un cours/session via son badge.
  async function submitPresence(evenementId: string) {
    setSelectedEvent(evenementId)
    setSelectedResa(null)
    setStatus({ kind: 'submitting' })
    try {
      const res = await fetch(`/api/v1/checkin/${encodeURIComponent(token)}/presence`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evenementId }),
      })
      const json = await res.json()
      if (!res.ok) {
        setStatus({ kind: 'error', message: json?.error?.message ?? `Erreur ${res.status}` })
        return
      }
      const titre = json?.data?.titre ?? 'cours/session'
      setStatus({ kind: 'success', message: `Présence enregistrée : ${jeune.prenom} — ${titre}` })
    } catch {
      setStatus({ kind: 'error', message: 'Erreur réseau, réessayer.' })
    }
  }

  const visibleReservations = useMemo(
    () => reservations.filter((r) => !centreId || r.centreId === centreId),
    [reservations, centreId],
  )

  async function submit(reservationId: string | null) {
    if (!centreId) {
      setStatus({ kind: 'error', message: 'Sélectionner un centre.' })
      return
    }
    setStatus({ kind: 'submitting' })
    try {
      const res = await fetch(`/api/v1/checkin/${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          centreId,
          ...(reservationId ? { reservationId } : {}),
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setStatus({
          kind:    'error',
          message: json?.error?.message ?? `Erreur ${res.status}`,
        })
        return
      }
      const name = json?.data?.jeuneName ?? `${jeune.prenom} ${jeune.nom}`
      setStatus({ kind: 'success', message: `Présent confirmé : ${name}` })
    } catch {
      setStatus({ kind: 'error', message: 'Erreur réseau, réessayer.' })
    }
  }

  return (
    <main className="min-h-screen bg-color-surface-base">
      <header className="bg-white border-b border-color-border px-space-4 py-space-3 flex items-center gap-space-3">
        <button
          type="button"
          aria-label="Retour"
          onClick={() => history.back()}
          className="inline-flex items-center justify-center min-w-[var(--tap-min)] min-h-[var(--tap-min)] text-gj-teal-deep"
        >
          <Icon name="chevron-left" size={24} title="Retour" />
        </button>
        <h1 className="text-fs-500 font-bold text-color-text-primary">Check-in</h1>
      </header>

      <section className="max-w-md mx-auto p-space-4 flex flex-col gap-space-4">
        {/* Identité jeune */}
        <div className="rounded-gj-lg bg-white p-space-4 shadow-gj-sm flex items-center gap-space-3">
          <div
            aria-hidden
            className="w-12 h-12 rounded-full bg-gj-teal-soft text-gj-teal-deep font-bold flex items-center justify-center text-fs-400"
          >
            {initials(jeune.prenom, jeune.nom)}
          </div>
          <div className="min-w-0">
            <p className="text-fs-400 font-bold text-color-text-primary truncate">
              {jeune.prenom} {jeune.nom}
            </p>
            <p className="text-fs-200 text-color-text-secondary">{jeune.cjsUidMasked}</p>
          </div>
        </div>

        {/* Centre (en pratique 1 seul, celui du staff connecté) */}
        <div className="rounded-gj-lg bg-white p-space-4 shadow-gj-sm flex flex-col gap-space-3">
          <label className="flex flex-col gap-space-1">
            <span className="text-fs-300 font-bold text-color-text-primary">Centre</span>
            <select
              value={centreId}
              onChange={(e) => setCentreId(e.target.value)}
              className="min-h-[var(--tap-min)] rounded-gj-md border border-color-border px-space-3 text-fs-300 bg-white"
            >
              {centres.length === 0 && <option value="">— Aucun centre —</option>}
              {centres.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </label>
        </div>

        {/* Réservations du jour */}
        <div className="rounded-gj-lg bg-white p-space-4 shadow-gj-sm flex flex-col gap-space-3">
          <h2 className="text-fs-400 font-bold text-color-text-primary">
            Réservations du jour
          </h2>
          {visibleReservations.length === 0 ? (
            <p className="text-fs-300 text-color-text-secondary">
              Aucune réservation aujourd'hui pour ce jeune. Vous pouvez confirmer une présence sans réservation.
            </p>
          ) : (
            <ul className="flex flex-col gap-space-2">
              {visibleReservations.map((r) => (
                <li
                  key={r.id}
                  className="rounded-gj-md border border-color-border p-space-3 flex items-center justify-between gap-space-3"
                >
                  <div className="min-w-0">
                    <p className="text-fs-300 font-bold text-color-text-primary truncate">
                      {r.ressourceNom}{' '}
                      <span className="text-color-text-secondary font-normal">· {r.ressourceType}</span>
                    </p>
                    <p className="text-fs-200 text-color-text-secondary">
                      {r.creneauDebut}–{r.creneauFin} · {r.centreNom}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={status.kind === 'submitting' && selectedResa === r.id}
                    disabled={status.kind === 'submitting'}
                    onClick={() => {
                      setSelectedResa(r.id)
                      submit(r.id)
                    }}
                  >
                    Marquer présent
                  </Button>
                </li>
              ))}
            </ul>
          )}

          <Button
            variant="ghost"
            size="md"
            loading={status.kind === 'submitting' && selectedResa === null}
            disabled={status.kind === 'submitting'}
            onClick={() => {
              setSelectedResa(null)
              submit(null)
            }}
          >
            Confirmer présence sans réservation
          </Button>
        </div>

        {/* GUIC-474 — Cours/sessions en cours au centre : présence par badge */}
        {evenements.length > 0 && (
          <div className="rounded-gj-lg bg-white p-space-4 shadow-gj-sm flex flex-col gap-space-3">
            <h2 className="text-fs-400 font-bold text-color-text-primary">
              Cours / sessions au centre
            </h2>
            <ul className="flex flex-col gap-space-2">
              {evenements.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-gj-md border border-color-border p-space-3 flex items-center justify-between gap-space-3"
                >
                  <div className="min-w-0">
                    <p className="text-fs-300 font-bold text-color-text-primary truncate">{ev.titre}</p>
                    <p className="text-fs-200 text-color-text-secondary">{ev.type}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="primary"
                    loading={status.kind === 'submitting' && selectedEvent === ev.id}
                    disabled={status.kind === 'submitting'}
                    onClick={() => submitPresence(ev.id)}
                  >
                    Marquer présent
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Statut */}
        {status.kind === 'success' && (
          <div className="rounded-gj-md bg-gj-teal-soft text-gj-teal-deep p-space-3 flex items-center gap-space-2">
            <Icon name="check-circle" size={20} title="Succès" />
            <p className="text-fs-300 font-bold">{status.message}</p>
          </div>
        )}
        {status.kind === 'error' && (
          <div className="rounded-gj-md bg-white border border-gj-red text-gj-red p-space-3 flex items-center gap-space-2" role="alert">
            <Icon name="alert" size={20} title="Erreur" />
            <p className="text-fs-300 font-bold">{status.message}</p>
          </div>
        )}
        {status.kind === 'idle' && (
          <p className="text-fs-200 text-color-text-secondary text-center">En attente confirmation</p>
        )}
      </section>
    </main>
  )
}
