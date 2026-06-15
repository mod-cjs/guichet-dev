import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getMesReservationsCentres } from '@/lib/loaders/centres'
import { PageHeader } from '@/components/ui'
import { MesReservationsCentresClient } from './mes-reservations-centres-client'

// GUIC-384 — Wave 5 — Mes réservations centres.

export const metadata: Metadata = {
  title: 'Mes réservations centres',
  description:
    'Tes réservations de ressources dans les centres CJS — à venir, en attente, passées, annulées.',
}

export const dynamic = 'force-dynamic'

export default async function MesReservationsCentresPage() {
  const session = await getSession()
  if (!session) {
    redirect('/auth/connexion?return=%2Fjeune%2Fmes-reservations-centres')
  }

  const reservations = await getMesReservationsCentres(session.cjsUid)

  return (
    <div>
      <PageHeader
        title="Mes réservations centres"
        subtitle="Tes réservations de ressources dans les centres CJS."
      />
      <MesReservationsCentresClient reservations={reservations} />
    </div>
  )
}
