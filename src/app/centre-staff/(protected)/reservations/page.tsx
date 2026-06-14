/**
 * GUIC-387 — Liste réservations du jour du centre staff.
 * GUIC-395 — Ajout bouton "Annuler" (Lot 7 W6 MVP).
 */

import { getStaffSession } from '@/lib/auth/staff-session'
import { prisma } from '@/lib/prisma'
import ReservationsListClient, {
  type StaffReservationRow,
} from './reservations-list-client'

export const dynamic = 'force-dynamic'

function fmtDate(d: Date): string {
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: '2-digit', month: 'long' })
}

export default async function StaffReservationsPage({
  searchParams,
}: {
  searchParams?: Promise<{ date?: string }>
}) {
  const session = await getStaffSession()
  if (!session) return null

  const sp = (await searchParams) ?? {}
  const day = sp.date ? new Date(sp.date) : new Date()
  if (Number.isNaN(day.getTime())) day.setTime(Date.now())
  const start = new Date(day); start.setHours(0, 0, 0, 0)
  const end = new Date(day);   end.setHours(23, 59, 59, 999)

  const reservations = await prisma.reservation.findMany({
    where: {
      centreId:     session.centreId,
      dateReservee: { gte: start, lte: end },
    },
    select: {
      id:           true,
      creneauDebut: true,
      creneauFin:   true,
      statut:       true,
      motif:        true,
      utilisateur:  { select: { nom: true, prenom: true } },
      ressource:    { select: { nom: true, type: true } },
    },
    orderBy: { creneauDebut: 'asc' },
    take:    100,
  })

  const rows: StaffReservationRow[] = reservations.map((r) => ({
    id:           r.id,
    creneauDebut: r.creneauDebut,
    creneauFin:   r.creneauFin,
    statut:       String(r.statut),
    motif:        r.motif,
    utilisateur:  r.utilisateur,
    ressource:    { nom: r.ressource.nom, type: String(r.ressource.type) },
  }))

  const isoDay = start.toISOString().slice(0, 10)

  return (
    <section className="flex flex-col gap-space-4">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-space-2">
        <div>
          <h1 className="text-fs-600 font-bold text-color-text-primary">Réservations</h1>
          <p className="text-fs-300 text-color-text-secondary">{fmtDate(start)}</p>
        </div>
        <form method="GET" className="flex items-center gap-space-2">
          <label className="text-fs-200 text-color-text-secondary" htmlFor="date">Date</label>
          <input
            id="date"
            type="date"
            name="date"
            defaultValue={isoDay}
            className="min-h-[var(--tap-min)] rounded-gj-md border border-color-border px-space-3 text-fs-300 bg-white"
          />
          <button type="submit" className="min-h-[var(--tap-min)] px-space-3 rounded-gj-md bg-gj-teal text-white font-bold">
            Voir
          </button>
        </form>
      </header>

      <ReservationsListClient centreId={session.centreId} reservations={rows} />
    </section>
  )
}
