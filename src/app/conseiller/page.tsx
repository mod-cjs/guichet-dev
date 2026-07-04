import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSession } from '@/lib/auth'
import {
  getConseillerContext,
  getConseillerKpis,
  getReservationsAValider,
  getAgendaDuJour,
} from '@/lib/loaders/conseiller'
import { PageHeader } from '@/components/ui/PageHeader'
import { Icon } from '@/components/ui/Icon'
import { DashboardKpis } from './dashboard-kpis'
import { ReservationsAValider } from './reservations-a-valider'
import { AgendaDuJour } from './agenda-du-jour'

export const dynamic = 'force-dynamic'

/**
 * GUIC-493/494/495/496/497 — Dashboard conseiller (Lot 8).
 * En-tête (US-1) + 4 KPI (US-2) + file des réservations à valider (US-3/US-4)
 * + agenda du jour dérivé (US-5). Toutes les données sont scopées au centre.
 * Rendu fidèle à `design-guichet-v4/agent-web.jsx`.
 */

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

export default async function ConseillerDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const [kpis, reservations, agenda] = await Promise.all([
    getConseillerKpis(ctx.centreId),
    getReservationsAValider(ctx.centreId, 3),
    getAgendaDuJour(ctx.centreId),
  ])

  const dateStr = DATE_FMT.format(new Date())
  const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div className="flex flex-col gap-space-4 md:gap-space-5">
      {/* En-tête (clair, toutes tailles) — l'identité sombre est portée par la topbar mobile (une seule barre foncée). */}
      <PageHeader
        title={`Bonjour ${ctx.prenom || 'conseiller'} 👋`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-space-3 gap-y-space-1">
            <span>{dateCap} · voici l&apos;activité du jour</span>
            <span className="inline-flex items-center gap-space-1 text-gj-teal-deep font-semibold">
              <Icon name="pin" size={14} />
              {ctx.centreNom}
            </span>
          </span>
        }
      />

      <DashboardKpis kpis={kpis} />

      {/* CTA scan — mobile (design v4 : bouton plein « Scanner les présences ») */}
      <Link href="/conseiller/checkin" className="md:hidden inline-flex items-center justify-center gap-space-2 no-underline font-extrabold" style={{ background: 'var(--gj-teal-deep)', color: '#fff', minHeight: 52, borderRadius: 12, fontSize: 15 }}>
        <Icon name="target" size={19} /> Scanner les présences
      </Link>

      <div className="grid gap-space-4 md:gap-space-5 grid-cols-1 lg:grid-cols-[1.5fr_1fr] items-start">
        <ReservationsAValider rows={reservations} />
        <AgendaDuJour items={agenda} />
      </div>
    </div>
  )
}
