/**
 * GUIC-387 — Liste réservations du jour du centre staff (lecture seule MVP).
 */

import { getStaffSession } from '@/lib/auth/staff-session'
import { prisma } from '@/lib/prisma'

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

      {reservations.length === 0 ? (
        <p className="text-fs-300 text-color-text-secondary">Aucune réservation pour cette date.</p>
      ) : (
        <ul className="flex flex-col gap-space-2" data-testid="staff-reservations-list">
          {reservations.map((r) => (
            <li key={r.id} className="rounded-gj-lg bg-white p-space-3 shadow-gj-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-2">
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
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
