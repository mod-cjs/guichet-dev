import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadDashboardCounts, loadRecentActivity, ACTIVITY_LIMIT_DEFAULT } from '@/lib/dashboard-loader'
import { prisma } from '@/lib/prisma'
import { DashboardHero, DashboardCompteurs, ActivityFeed, DashboardCTACard } from '@/components/dashboard'
import { Icon } from '@/components/ui/Icon'

export const metadata = { title: 'Tableau de bord — Guichet Jeunesse' }

export default async function TableauDeBordPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const [counts, activity, profil] = await Promise.all([
    loadDashboardCounts(session.cjsUid),
    loadRecentActivity(session.cjsUid, ACTIVITY_LIMIT_DEFAULT),
    prisma.profilJeune.findUnique({
      where:  { cjsUid: session.cjsUid },
      select: { completionScore: true },
    }),
  ])

  const completionScore = profil?.completionScore ?? 0

  return (
    <div className="flex flex-col gap-space-5">
      <DashboardHero
        prenom={session.prenom ?? ''}
        nom={session.nom ?? ''}
        completionScore={completionScore}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-5">
        {/* Colonne principale : compteurs + CTA (2/3) */}
        <div className="lg:col-span-2 flex flex-col gap-space-5">
          <DashboardCompteurs counts={counts} />

          {/* CTA cachés en mobile (redondants avec la BottomNav qui couvre déjà
              profil, opportunités et événements). Visibles à partir de md où il
              n'y a pas de BottomNav. */}
          <div className="hidden md:grid grid-cols-1 md:grid-cols-3 gap-space-3">
            <DashboardCTACard
              href="/jeune/mon-profil"
              title="Compléter mon profil"
              description="Diplômes, expériences, compétences"
              icon={<Icon name="learning" />}
            />
            <DashboardCTACard
              href="/opportunites"
              title="Voir les opportunités"
              description="Stages, emplois, formations, bourses"
              icon={<Icon name="document" />}
            />
            <DashboardCTACard
              href="/agenda"
              title="Voir les événements"
              description="Forums, ateliers, webinaires"
              icon={<Icon name="calendar" />}
            />
          </div>
        </div>

        {/* Colonne secondaire : flux d'activités sticky desktop (1/3) */}
        <aside className="lg:col-span-1">
          <div className="lg:sticky lg:top-[80px]">
            <ActivityFeed items={activity} />
          </div>
        </aside>
      </div>
    </div>
  )
}
