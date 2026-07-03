import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { getConseillerContext } from '@/lib/loaders/conseiller'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/Card'
import { Icon, type IconName } from '@/components/ui/Icon'

export const dynamic = 'force-dynamic'

/**
 * GUIC-493 — US-1 Vue d'ensemble du dashboard conseiller à la connexion.
 * Affiche le nom du conseiller, la date du jour et son centre de rattachement.
 * Les blocs KPI (US-2), file des réservations (US-3) et agenda (US-5) sont des
 * emplacements de Phase 2 — voir `.agent_context/specs/M8-espace-conseiller.md`.
 */

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

/** Emplacements KPI (US-2) — valeurs branchées en Phase 2. */
const KPI_SLOTS: { label: string; icon: IconName }[] = [
  { label: 'Bénéficiaires actifs', icon: 'users' },
  { label: 'Réservations à valider', icon: 'calendar' },
  { label: 'RDV aujourd’hui', icon: 'clock' },
  { label: 'Candidatures du mois', icon: 'employment' },
]

export default async function ConseillerDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const ctx = await getConseillerContext(session.cjsUid)
  if (!ctx) redirect('/')

  const dateStr = DATE_FMT.format(new Date())
  const dateCap = dateStr.charAt(0).toUpperCase() + dateStr.slice(1)

  return (
    <div>
      <PageHeader
        title={`Bonjour ${ctx.prenom || 'conseiller'}`}
        subtitle={
          <span className="inline-flex flex-wrap items-center gap-x-space-3 gap-y-space-1">
            <span>{dateCap}</span>
            <span className="inline-flex items-center gap-space-1 text-gj-teal-deep font-semibold">
              <Icon name="pin" size={14} />
              {ctx.centreNom}
            </span>
          </span>
        }
      />

      {/* KPI (US-2) — emplacements, valeurs en Phase 2 */}
      <section aria-label="Indicateurs clés" className="grid gap-space-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        {KPI_SLOTS.map((k) => (
          <Card key={k.label} className="flex items-center gap-space-3">
            <span className="inline-flex items-center justify-center rounded-gj-lg bg-gj-teal-soft text-gj-teal-deep shrink-0" style={{ width: 44, height: 44 }}>
              <Icon name={k.icon} size={22} />
            </span>
            <div className="min-w-0">
              <div className="text-fs-200 text-color-text-secondary truncate">{k.label}</div>
              <div className="text-fs-600 font-black text-color-text-primary" aria-hidden>—</div>
            </div>
          </Card>
        ))}
      </section>

      {/* Blocs Phase 2 : réservations à valider (US-3) + agenda du jour (US-5) */}
      <div className="grid gap-space-4 mt-space-5 grid-cols-1 lg:grid-cols-2">
        <Card header={<h2 className="text-fs-400 font-bold text-color-text-primary m-0">Réservations à valider</h2>}>
          <p className="text-fs-300 text-color-text-secondary m-0">Disponible prochainement.</p>
        </Card>
        <Card header={<h2 className="text-fs-400 font-bold text-color-text-primary m-0">Agenda du jour</h2>}>
          <p className="text-fs-300 text-color-text-secondary m-0">Disponible prochainement.</p>
        </Card>
      </div>
    </div>
  )
}
