import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  DashboardHero,
  DashboardKPIs,
  DashboardTracker,
  OpportunitesRecoCarousel,
  YayeNudgeCard,
  MOCK_KPIS,
  MOCK_RECO_OPPS,
  MOCK_EVENTS,
  MOCK_CENTRES,
} from '@/components/dashboard'
import { Icon } from '@/components/ui'

export const metadata = { title: 'Tableau de bord — Guichet Jeunesse' }

/**
 * Tableau de bord bénéficiaire — refonte v2.
 *
 * Mobile (< lg) : empilement vertical des 7 sections (Hero, KPIs, Tracker,
 * Reco, Events, Centres, Yaye nudge).
 *
 * Desktop (≥ lg) : layout 2fr/1fr conforme `design-guichet-v2/web-dashboard.jsx`
 *   - Colonne principale (2fr) : Hero + KPIs + Tracker + RecoCarousel
 *   - Aside (1fr sticky)       : Events + Centres + YayeNudge
 */
export default async function TableauDeBordPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const profil = await prisma.profilJeune.findUnique({
    where:  { cjsUid: session.cjsUid },
    select: { completionScore: true },
  })
  const completionScore = profil?.completionScore ?? 0

  return (
    <div className="flex flex-col gap-space-5">
      {/* 1. Hero — pleine largeur sur les 2 colonnes */}
      <DashboardHero
        prenom={session.prenom ?? ''}
        nom={session.nom ?? ''}
        programme="Programme YEAH"
      />

      <div className="lg:grid lg:grid-cols-[2fr_1fr] lg:gap-space-5 flex flex-col gap-space-5">
        {/* Colonne principale (2fr) */}
        <div className="flex flex-col gap-space-5">
          <DashboardKPIs items={MOCK_KPIS} />
          <DashboardTracker score={completionScore} />
          <OpportunitesRecoCarousel
            opps={MOCK_RECO_OPPS}
            title="À ne pas rater"
            lede="Sélection pour ton profil · clôture imminente"
          />
        </div>

        {/* Aside (1fr sticky) */}
        <aside className="flex flex-col gap-space-5">
          <div className="lg:sticky lg:top-[80px] flex flex-col gap-space-5">
            {/* Événements à venir */}
            <section aria-label="Événements à venir">
              <header className="flex items-baseline justify-between mb-space-3">
                <h2 className="text-fs-400 font-black text-gj-ink">Événements à venir</h2>
                <Link
                  href="/agenda"
                  className="text-fs-200 font-black text-gj-teal-deep hover:underline"
                >
                  Voir tous →
                </Link>
              </header>
              <ul className="bg-gj-surface border-[1.5px] border-gj-line rounded-gj-lg divide-y divide-gj-line">
                {MOCK_EVENTS.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center gap-space-3 p-space-3"
                  >
                    <div className="flex-shrink-0 w-12 text-center rounded-gj-md bg-gj-teal-soft text-gj-teal-deep py-space-1">
                      <div className="text-fs-400 font-black leading-none">{e.jour}</div>
                      <div className="text-[10px] font-black uppercase tracking-wider mt-1">{e.mois}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-fs-300 font-extrabold leading-snug">{e.titre}</div>
                      <div className="text-fs-100 text-gj-grey mt-1">{e.sous}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>

            {/* Centres proches */}
            <section aria-label="Centres CJS proches">
              <header className="flex items-baseline justify-between mb-space-3">
                <h2 className="text-fs-400 font-black text-gj-ink">Centres près de toi</h2>
                <Link
                  href="/centres"
                  className="text-fs-200 font-black text-gj-teal-deep hover:underline"
                >
                  Carte →
                </Link>
              </header>
              <ul className="bg-gj-surface border-[1.5px] border-gj-line rounded-gj-lg divide-y divide-gj-line">
                {MOCK_CENTRES.slice(0, 3).map((c) => (
                  <li key={c.id} className="flex items-center gap-space-3 p-space-3">
                    <span
                      className="w-8 h-8 rounded-gj-md bg-gj-yellow-soft text-gj-yellow-ink inline-flex items-center justify-center flex-shrink-0"
                      aria-hidden
                    >
                      <Icon name="pin" size={16} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-fs-300 font-extrabold leading-snug">{c.nom}</div>
                      <div className="text-fs-100 text-gj-grey mt-1 truncate">{c.adresse}</div>
                    </div>
                    <span className="text-fs-100 font-black text-gj-teal-deep whitespace-nowrap">
                      {c.distance}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            {/* Yaye nudge */}
            <YayeNudgeCard nbConseils={3} />
          </div>
        </aside>
      </div>
    </div>
  )
}
