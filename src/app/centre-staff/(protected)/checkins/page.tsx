/**
 * GUIC-387 — Historique check-ins du centre (7 derniers jours par défaut).
 */

import { getStaffSession } from '@/lib/auth/staff-session'
import { prisma } from '@/lib/prisma'
import { etatFrequentation } from '@/lib/centres/frequentation'

export const dynamic = 'force-dynamic'

function fmtDateTime(d: Date): string {
  return d.toLocaleString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function StaffCheckInsPage({
  searchParams,
}: {
  searchParams?: Promise<{ days?: string }>
}) {
  const session = await getStaffSession()
  if (!session) return null

  const sp = (await searchParams) ?? {}
  const days = Math.max(1, Math.min(30, Number.parseInt(sp.days ?? '7', 10) || 7))
  const since = new Date(Date.now() - days * 24 * 3600 * 1000)

  const checkIns = await prisma.checkIn.findMany({
    where: {
      centreId:  session.centreId,
      effectueA: { gte: since },
    },
    select: {
      id:              true,
      effectueA:       true,
      via:             true,
      conseillerEmail: true,
      reservationId:   true,
      utilisateur:     { select: { nom: true, prenom: true } },
    },
    orderBy: { effectueA: 'desc' },
    take:    200,
  })

  // GUIC-689 (M4) — état du jour, CALCULÉ à l'affichage : rien n'est stocké,
  // et une entrée oubliée reste ouverte plutôt que d'être clôturée d'office.
  const etat = await etatFrequentation(session.centreId)

  return (
    <section className="flex flex-col gap-space-4">
      <div
        className="rounded-gj-lg bg-white p-space-3 shadow-gj-sm flex flex-wrap gap-space-4"
        data-testid="staff-frequentation-jour"
      >
        <div>
          <p className="text-fs-600 font-black text-gj-teal-deep tabular-nums">{etat.presents.length}</p>
          <p className="text-fs-200 text-color-text-secondary">
            présent{etat.presents.length > 1 ? 's' : ''} en ce moment
          </p>
        </div>
        <div>
          <p className="text-fs-600 font-black text-color-text-primary tabular-nums">
            {/* Jamais de moyenne inventée : sans sortie scannée, on écrit « — ».
                Un « 0 min » se lirait « ils sont repartis aussitôt ». */}
            {etat.duree.moyenneMinutes === null ? '—' : `${etat.duree.moyenneMinutes} min`}
          </p>
          <p className="text-fs-200 text-color-text-secondary">
            durée moyenne, mesurée sur {etat.duree.partMesuree} % des {etat.duree.passages} passage
            {etat.duree.passages > 1 ? 's' : ''} du jour
          </p>
        </div>
      </div>

      <header>
        <h1 className="text-fs-600 font-bold text-color-text-primary">Check-ins</h1>
        <p className="text-fs-300 text-color-text-secondary">
          {checkIns.length} check-in{checkIns.length > 1 ? 's' : ''} sur les {days} derniers jours
        </p>
      </header>

      {checkIns.length === 0 ? (
        <p className="text-fs-300 text-color-text-secondary">Aucun check-in sur cette période.</p>
      ) : (
        <ul className="flex flex-col gap-space-2" data-testid="staff-checkins-list">
          {checkIns.map((c) => (
            <li key={c.id} className="rounded-gj-lg bg-white p-space-3 shadow-gj-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-space-2">
              <div className="min-w-0">
                <p className="text-fs-300 font-bold text-color-text-primary truncate">
                  {c.utilisateur.prenom} {c.utilisateur.nom}
                </p>
                <p className="text-fs-200 text-color-text-secondary truncate">
                  {c.conseillerEmail ?? '—'} · {c.via}
                  {c.reservationId ? ' · liée à une réservation' : ''}
                </p>
              </div>
              <span className="text-fs-300 text-color-text-secondary tabular-nums">
                {fmtDateTime(c.effectueA)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
