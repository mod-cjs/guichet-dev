import { redirect } from 'next/navigation'
import { estMasquee, masquesUtilisateur } from '@/lib/flags/ui-server'
import { getSession } from '@/lib/auth'
import { loadDashboardCounts } from '@/lib/dashboard-loader'
import { loadDashboardData } from '@/lib/loaders/dashboard'
import { prisma } from '@/lib/prisma'
import {
  WebDashHero,
  WebDashKPIs,
  WebDashTracker,
  WebDashEvents,
  WebDashCenters,
  WebDashProfileNudge,
  WebDashYayePanel,
  OpportunitesRecoCarousel,
  type KPIItem,
} from '@/components/dashboard'

export const metadata = { title: 'Tableau de bord — Guichet Jeunesse' }
// CDP : page personnelle, jamais cachée par le CDN. Force le rendu dynamique.
export const dynamic = 'force-dynamic'

export default async function TableauDeBordPage() {
  const session = await getSession()
  const agendaMasque = await estMasquee('m5.agenda', session?.roles)
  const masques = await masquesUtilisateur(session?.roles)
  if (!session) redirect('/auth/connexion')

  const [counts, profil, dashboard] = await Promise.all([
    loadDashboardCounts(session.cjsUid),
    prisma.profilJeune.findUnique({
      where:  { cjsUid: session.cjsUid },
      select: { completionScore: true },
    }),
    loadDashboardData(session.cjsUid),
  ])

  const completionScore = profil?.completionScore ?? 0
  const { recoOpps, events, centres, tracker } = dashboard

  // J-N affiché dans le hero : deadline la plus urgente parmi les recos.
  // GUIC-689 — lu directement sur le champ dédié (avant : extrait à la regex
  // d'un libellé fusionné « Type · J-N », qui n'existe plus).
  const joursAvantCloture = recoOpps[0]?.joursRestants ?? null

  const kpis: KPIItem[] = [
    {
      value: counts.candidatures,
      label: 'Candidatures en cours',
      icon:  'document',
      tone:  'teal',
      href:  '/jeune/mes-candidatures',
    },
    {
      value: recoOpps.length,
      label: 'Opps recommandées',
      hint:  recoOpps.length > 0 ? 'Pour ton profil' : 'Complète ton profil',
      hintTone: recoOpps.length > 0 ? 'positive' : 'warning',
      icon:  'sparkle',
      tone:  'yellow',
      href:  '/opportunites',
    },
    {
      value: counts.favoris,
      label: 'Sauvegardées',
      icon:  'bookmark',
      tone:  'blue',
      href:  '/jeune/mes-favoris',
    },
    {
      value: `${completionScore} %`,
      label: 'Profil complété',
      hint:  completionScore >= 80 ? 'Niveau pro' : 'Ajoute ton CV',
      hintTone: completionScore >= 80 ? 'positive' : 'warning',
      icon:  'profile',
      tone:  'red',
      href:  '/jeune/mon-profil',
    },
  ]

  return (
    <div className="flex flex-col gap-space-5">
      <WebDashHero masques={masques}
        prenom={session.prenom ?? ''}
        candidaturesEnCours={counts.candidatures}
        oppsRecommandees={recoOpps.length}
        joursAvantCloture={joursAvantCloture ?? 0}
      />

      <WebDashKPIs items={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-space-5">
        {/* Colonne principale (desktop ≥ lg) */}
        <div className="flex flex-col gap-space-5 min-w-0">
          <OpportunitesRecoCarousel items={recoOpps} />

          <section aria-labelledby="tracker-heading">
            <header className="flex items-baseline justify-between mb-space-3">
              <div>
                <h2 id="tracker-heading" className="text-fs-500 font-black">
                  Mes candidatures en cours
                </h2>
                <p className="text-fs-200 text-color-text-secondary mt-space-1">
                  {counts.candidatures > 0
                    ? `${counts.candidatures} dossier${counts.candidatures > 1 ? 's' : ''} actif${counts.candidatures > 1 ? 's' : ''}`
                    : 'Aucun dossier actif pour le moment.'}
                </p>
              </div>
              <a
                href="/jeune/mes-candidatures"
                className="text-fs-200 font-black text-gj-teal-deep hover:underline"
              >
                Voir toutes →
              </a>
            </header>
            <WebDashTracker items={tracker} />
          </section>
        </div>

        {/* Colonne aside (desktop ≥ lg) */}
        <aside className="flex flex-col gap-space-4 min-w-0">
          <WebDashCenters masques={masques} items={centres} />
          {/* GUIC-706 — surface d'incidence : la section entière disparaît, titre compris.
              Un « Événements à venir » suivi de rien ne cache pas l'absence, il la montre. */}
          {!agendaMasque && <WebDashEvents items={events} />}
          <WebDashProfileNudge completionScore={completionScore} />
          <WebDashYayePanel />
        </aside>
      </div>
    </div>
  )
}
