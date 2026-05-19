import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadDashboardCounts, loadRecentActivity, ACTIVITY_LIMIT_DEFAULT } from '@/lib/dashboard-loader'
import { prisma } from '@/lib/prisma'
import { Card, Button } from '@/components/ui'
import { CompletionBar } from '@/components/profil'
import { DashboardCompteurs, ActivityFeed, DashboardCTACard } from '@/components/dashboard'
import { IconCandidature, IconEvenement, IconDiplome } from '@/components/dashboard/icons'
import Link from 'next/link'

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
    <div className="flex flex-col gap-space-5 pb-[calc(56px+env(safe-area-inset-bottom,0px))]">
      <div>
        <h1 className="text-fs-600 font-black text-color-text-primary">
          Bonjour, {session.prenom}
        </h1>
        <p className="text-fs-300 text-color-text-secondary mt-space-1">
          Voici un aperçu de votre activité.
        </p>
      </div>

      <Card>
        <CompletionBar score={completionScore} />
        {completionScore < 80 && (
          <div className="flex items-center justify-between gap-space-3 mt-space-3">
            <p className="text-fs-200 text-color-text-secondary">
              Complétez votre profil pour accéder à plus d&apos;opportunités.
            </p>
            <Link href="/jeune/mon-profil">
              <Button variant="ghost" size="sm">Compléter</Button>
            </Link>
          </div>
        )}
      </Card>

      <DashboardCompteurs counts={counts} />

      <ActivityFeed items={activity} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-space-3">
        <DashboardCTACard
          href="/jeune/mon-profil"
          title="Compléter mon profil"
          description="Diplômes, expériences, compétences"
          icon={<IconDiplome />}
        />
        <DashboardCTACard
          href="/opportunites"
          title="Voir les opportunités"
          description="Stages, emplois, formations, bourses"
          icon={<IconCandidature />}
        />
        <DashboardCTACard
          href="/evenements"
          title="Voir les événements"
          description="Forums, ateliers, webinaires"
          icon={<IconEvenement />}
        />
      </div>
    </div>
  )
}
