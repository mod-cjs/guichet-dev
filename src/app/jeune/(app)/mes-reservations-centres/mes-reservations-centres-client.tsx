'use client'

import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import { EmptyState, Toast } from '@/components/ui'
import { ReservationCard } from '@/components/centres/ReservationCard'
import { ReservationsTabs, type ReservationTab } from '@/components/centres/ReservationsTabs'
import { QRRetrievalModal } from '@/components/centres/QRRetrievalModal'
import type { MesReservationCentre } from '@/lib/loaders/centres'

interface Props {
  reservations: MesReservationCentre[]
}

type TabKey = 'a-venir' | 'en-attente' | 'passees' | 'annulees' | 'toutes'

function isUpcoming(r: MesReservationCentre, now: Date): boolean {
  const d = new Date(r.dateReservee)
  const [h, m] = r.creneauFin.split(':').map(Number)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d.getTime() > now.getTime()
}

/**
 * Vue "Mes réservations centres" (page `/jeune/mes-reservations-centres`).
 * 5 tabs filtrables, annulation inline, modal QR de retrait.
 * GUIC-384 — Wave 5.
 */
export function MesReservationsCentresClient({ reservations: initial }: Props) {
  const [reservations, setReservations] = useState(initial)
  const [tab, setTab] = useState<TabKey>('a-venir')
  const [qrFor, setQrFor] = useState<string | null>(null)
  const [toast, setToast] = useState<{ message: string; variant: 'success' | 'danger' } | null>(null)
  const pendingRef = useRef<string | null>(null)
  const trackedRef = useRef(false)

  // Tracking au mount — une seule fois
  useEffect(() => {
    if (trackedRef.current) return
    trackedRef.current = true
    fetch('/api/v1/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'centre_my_reservations_viewed',
        metadata: { count: initial.length },
      }),
    }).catch(() => {
      /* fail-soft */
    })
  }, [initial.length])

  const now = useMemo(() => new Date(), [])

  const buckets = useMemo(() => {
    const aVenir: MesReservationCentre[] = []
    const enAttente: MesReservationCentre[] = []
    const passees: MesReservationCentre[] = []
    const annulees: MesReservationCentre[] = []
    for (const r of reservations) {
      const upcoming = isUpcoming(r, now)
      if (r.statut === 'EnAttente') enAttente.push(r)
      if ((r.statut === 'Acceptee' || r.statut === 'EnAttente') && upcoming) {
        aVenir.push(r)
      }
      if (r.statut === 'Passee') passees.push(r)
      if (
        r.statut === 'AnnuleeParJeune' ||
        r.statut === 'Refusee' ||
        r.statut === 'NonHonoree'
      ) {
        annulees.push(r)
      }
    }
    return { aVenir, enAttente, passees, annulees, toutes: reservations }
  }, [reservations, now])

  const tabs: ReservationTab[] = [
    { key: 'a-venir', label: 'À venir', count: buckets.aVenir.length },
    { key: 'en-attente', label: 'En attente', count: buckets.enAttente.length },
    { key: 'passees', label: 'Passées', count: buckets.passees.length },
    { key: 'annulees', label: 'Annulées', count: buckets.annulees.length },
    { key: 'toutes', label: 'Toutes', count: buckets.toutes.length },
  ]

  const visible: MesReservationCentre[] =
    tab === 'a-venir'
      ? buckets.aVenir
      : tab === 'en-attente'
        ? buckets.enAttente
        : tab === 'passees'
          ? buckets.passees
          : tab === 'annulees'
            ? buckets.annulees
            : buckets.toutes

  const handleCancel = useCallback((reservationId: string) => {
    if (pendingRef.current) return
    pendingRef.current = reservationId
    fetch(`/api/reservations/${reservationId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel' }),
    })
      .then(async (r) => {
        if (!r.ok) throw new Error(String(r.status))
        setReservations((prev) =>
          prev.map((x) =>
            x.id === reservationId
              ? { ...x, statut: 'AnnuleeParJeune', decisionA: new Date().toISOString() }
              : x,
          ),
        )
        setToast({ message: 'Réservation annulée', variant: 'success' })
      })
      .catch(() =>
        setToast({ message: 'Annulation impossible — réessaye.', variant: 'danger' }),
      )
      .finally(() => {
        pendingRef.current = null
      })
  }, [])

  const qrReservation = qrFor
    ? reservations.find((r) => r.id === qrFor) ?? null
    : null

  return (
    <div className="flex flex-col gap-space-4">
      <ReservationsTabs
        value={tab}
        tabs={tabs}
        onChange={(k) => setTab(k as TabKey)}
      />

      {visible.length === 0 ? (
        <EmptyState
          icon="pin"
          title="Aucune réservation"
          description="Découvre les centres CJS et réserve une salle, un véhicule ou un poste info."
          actionLabel="Découvrir les centres"
          onAction={() => {
            window.location.href = '/centres'
          }}
        />
      ) : (
        <ul
          id={`reservations-panel-${tab}`}
          role="tabpanel"
          aria-labelledby={`reservations-tab-${tab}`}
          className="grid grid-cols-1 gap-space-3 list-none p-0 m-0"
        >
          {visible.map((r) => (
            <li key={r.id}>
              <ReservationCard
                reservation={r}
                onCancel={handleCancel}
                onShowQR={() => setQrFor(r.id)}
                now={now}
              />
            </li>
          ))}
        </ul>
      )}

      {qrReservation ? (
        <QRRetrievalModal
          isOpen={Boolean(qrFor)}
          onClose={() => setQrFor(null)}
          reservation={{
            id: qrReservation.id,
            ressourceNom: qrReservation.ressource.nom,
            centreNom: qrReservation.centre.nom,
            dateReservee: qrReservation.dateReservee,
            creneauDebut: qrReservation.creneauDebut,
            creneauFin: qrReservation.creneauFin,
          }}
        />
      ) : null}

      {toast ? (
        <Toast
          message={toast.message}
          variant={toast.variant}
          onClose={() => setToast(null)}
        />
      ) : null}
    </div>
  )
}
