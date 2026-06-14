/**
 * GUIC-387 — Dashboard staff centre (lecture seule MVP).
 */

import Link from 'next/link'
import { getStaffSession } from '@/lib/auth/staff-session'
import { prisma } from '@/lib/prisma'
import { Icon } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

export default async function CentreStaffHome() {
  const session = await getStaffSession()
  if (!session) return null
  const centre = await prisma.centre.findUnique({
    where:  { id: session.centreId },
    select: { nom: true, ville: true },
  })

  return (
    <section className="flex flex-col gap-space-4">
      <header>
        <h1 className="text-fs-600 font-bold text-color-text-primary">
          Bonjour {session.email}
        </h1>
        {centre && (
          <p className="text-fs-300 text-color-text-secondary mt-space-1">
            Centre : {centre.nom}{centre.ville ? ` — ${centre.ville}` : ''}
          </p>
        )}
      </header>

      <div className="grid gap-space-3 md:grid-cols-2">
        <Link
          href="/centre-staff/reservations"
          className="rounded-gj-lg bg-white p-space-4 shadow-gj-sm hover:shadow-gj-md transition-shadow flex items-center gap-space-3 min-h-[var(--tap-min)]"
        >
          <Icon name="calendar" size={28} title="Réservations" />
          <div>
            <p className="text-fs-400 font-bold text-color-text-primary">Réservations du jour</p>
            <p className="text-fs-200 text-color-text-secondary">Voir les créneaux à venir</p>
          </div>
        </Link>
        <Link
          href="/centre-staff/checkins"
          className="rounded-gj-lg bg-white p-space-4 shadow-gj-sm hover:shadow-gj-md transition-shadow flex items-center gap-space-3 min-h-[var(--tap-min)]"
        >
          <Icon name="check-circle" size={28} title="Check-ins" />
          <div>
            <p className="text-fs-400 font-bold text-color-text-primary">Check-ins récents</p>
            <p className="text-fs-200 text-color-text-secondary">Historique 7 derniers jours</p>
          </div>
        </Link>
      </div>
    </section>
  )
}
