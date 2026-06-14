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

type TabKey = 'toutes' | 'en-attente' | 'acceptees' | 'refusees' | 'passees'

/**
 * Vue "Mes réservations centres" (page `/jeune/mes-reservations-centres`).
 * 5 tabs filtrables alignés sur les statuts métier (GUIC-392 / Lot 7 W5) :
 *   Toutes · En attente · Acceptées · Refusées · Passées.
 * Le tab "Passées" regroupe Passee + NonHonoree + AnnuleeParJeune + AnnuleeParCentre
 * (= tout ce qui est terminé / annulé).
 *
 * Annulation inline, modal QR de retrait.
 * GUIC-384 — Wave 5 (init) · GUIC-392 — refonte tabs.
 */
export function MesReservationsCentresClient({ reservations: initial }: Props) {
  const [reservations, setReservations] = useState(initial)
  const [tab, setTab] = useState<TabKey>('toutes')
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
    const enAttente: MesReservationCentre[] = []
    const acceptees: MesReservationCentre[] = []
    const refusees: MesReservationCentre[] = []
    const passees: MesReservationCentre[] = []
    for (const r of reservations) {
      if (r.statut === 'EnAttente') enAttente.push(r)
      else if (r.statut === 'Acceptee') acceptees.push(r)
      else if (r.statut === 'Refusee') refusees.push(r)
      else if (
        r.statut === 'Passee' ||
        r.statut === 'NonHonoree' ||
        r.statut === 'AnnuleeParJeune' ||
        r.statut === 'AnnuleeParCentre'
      ) {
        passees.push(r)
      }
    }
    return { toutes: reservations, enAttente, acceptees, refusees, passees }
  }, [reservations])

  const tabs: ReservationTab[] = [
    { key: 'toutes', label: 'Toutes', count: buckets.toutes.length },
    { key: 'en-attente', label: 'En attente', count: buckets.enAttente.length },
    { key: 'acceptees', label: 'Acceptées', count: buckets.acceptees.length },
    { key: 'refusees', label: 'Refusées', count: buckets.refusees.length },
    { key: 'passees', label: 'Passées', count: buckets.passees.length },
  ]

  const visible: MesReservationCentre[] =
    tab === 'toutes'
      ? buckets.toutes
      : tab === 'en-attente'
        ? buckets.enAttente
        : tab === 'acceptees'
          ? buckets.acceptees
          : tab === 'refusees'
            ? buckets.refusees
            : buckets.passees

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
