import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth'
import { loadDashboardCounts } from '@/lib/dashboard-loader'
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
  type TrackerItem,
  type DashEventItem,
  type DashCenterItem,
  type OppRecoCard,
} from '@/components/dashboard'

export const metadata = { title: 'Tableau de bord — Guichet Jeunesse' }

// =========================================================================
// Mock data (sera remplacé par des loaders API dans une PR de suite).
// =========================================================================

const mockRecoOpps: OppRecoCard[] = [
  {
    id:    'reco-1',
    tag:   'J-3 · Urgent',
    tone:  'urgent',
    title: 'Bourse agricole — maraîchage',
    org:   "jusqu'à 600 000 FCFA · Tambacounda",
    meta:  [
      { icon: 'pin',   label: 'Tambacounda' },
      { icon: 'users', label: '18–35 ans'   },
    ],
    match:    '92% match',
    ctaLabel: 'Candidater',
    href:     '/opportunites/reco-1',
  },
  {
    id:    'reco-2',
    tag:   'Stage · J-9',
    tone:  'info',
    title: 'Stage Data Science · 6 mois',
    org:   'Sonatel · Dakar Plateau',
    meta:  [
      { icon: 'pin',     label: 'Dakar'     },
      { icon: 'funding', label: '350k/mois' },
    ],
    match:    '87% match',
    ctaLabel: 'Candidater',
    href:     '/opportunites/reco-2',
  },
  {
    id:    'reco-3',
    tag:   'Alternance · J-12',
    tone:  'partner',
    title: 'Marketing digital · 12 mois',
    org:   'Senegal Airlines · Diass',
    meta:  [
      { icon: 'pin',        label: 'Diass'      },
      { icon: 'employment', label: 'Alternance' },
    ],
    match: '76% match',
    href:  '/opportunites/reco-3',
  },
  {
    id:    'reco-4',
    tag:   'Concours · J-21',
    tone:  'partner',
    title: 'Concours Jeunes Entrepreneurs 2026',
    org:   'National · 2.5M FCFA + coaching',
    meta:  [{ icon: 'users', label: '16–30 ans' }],
    ctaLabel: 'Voir critères',
    href:     '/opportunites/reco-4',
  },
]

const mockTracker: TrackerItem[] = [
  {
    id:          'trk-1',
    title:       'Bourse agricole — Micro-initiative maraîchère',
    subtitle:    'Déposée le 14 mai · J-3 avant clôture',
    icon:        'agriculture',
    tone:        'red',
    currentStep: 2,
    stepLabel:   'Revue conseiller CJS',
    cta:         { label: 'Compléter dossier', href: '/jeune/mes-candidatures/trk-1' },
  },
  {
    id:          'trk-2',
    title:       'Stage Data Science · Sonatel',
    subtitle:    'Entretien planifié — 26 mai · 10h',
    icon:        'employment',
    tone:        'teal',
    currentStep: 3,
    stepLabel:   'Entretien',
    cta:         { label: 'Préparer →', href: '/jeune/mes-candidatures/trk-2', variant: 'ghost' },
  },
  {
    id:          'trk-3',
    title:       'Bourse mobilité — UCAD Master 2',
    subtitle:    'Acceptée · démarrage 1er juin',
    icon:        'check-circle',
    tone:        'green',
    currentStep: 4,
    stepLabel:   'Confirmation',
    highlight:   'Bravo — confirme avant le 1er juin',
    cta:         { label: 'Détails', href: '/jeune/mes-candidatures/trk-3', variant: 'ghost' },
  },
]

const mockEvents: DashEventItem[] = [
  { id: 'ev-1', day: 22, month: 'Mai',  title: 'Atelier CV — CJS Tamba',     subtitle: '14h–17h · 5 places restantes', href: '/agenda/ev-1' },
  { id: 'ev-2', day: 28, month: 'Mai',  title: 'Forum emploi Diamniadio',   subtitle: '9h–18h · 40 recruteurs',       href: '/agenda/ev-2' },
  { id: 'ev-3', day:  2, month: 'Juin', title: 'Démarrage Bootcamp Data',   subtitle: 'CJS Dakar · 8 semaines',       href: '/agenda/ev-3' },
]

const mockCenters: DashCenterItem[] = [
  { id: 'c-1', name: 'CJS Tambacounda', address: 'Av. Léopold Sédar Senghor · wifi gratuit', distance: '2.4 km', href: '/centres/c-1' },
  { id: 'c-2', name: 'CJS Kédougou',    address: 'Quartier Lawol · réservation salle',       distance: '189 km', href: '/centres/c-2' },
  { id: 'c-3', name: 'CJS Kaolack',     address: 'Médina Baye · scan badge',                 distance: '220 km', href: '/centres/c-3' },
]

export default async function TableauDeBordPage() {
  const session = await getSession()
  if (!session) redirect('/auth/connexion')

  const [counts, profil] = await Promise.all([
    loadDashboardCounts(session.cjsUid),
    prisma.profilJeune.findUnique({
      where:  { cjsUid: session.cjsUid },
      select: { completionScore: true },
    }),
  ])

  const completionScore = profil?.completionScore ?? 0

  const kpis: KPIItem[] = [
    {
      value: counts.candidatures,
      label: 'Candidatures en cours',
      icon:  'document',
      tone:  'teal',
    },
    {
      // TODO : brancher le compteur réel "opps recommandées" (suite GUIC-196).
      value: mockRecoOpps.length,
      label: 'Opps recommandées',
      hint:  '90%+ match',
      hintTone: 'positive',
      icon:  'sparkle',
      tone:  'yellow',
    },
    {
      value: counts.favoris,
      label: 'Sauvegardées',
      icon:  'bookmark',
      tone:  'blue',
    },
    {
      value: `${completionScore} %`,
      label: 'Profil complété',
      hint:  completionScore >= 80 ? 'Niveau pro' : 'Ajoute ton CV',
      hintTone: completionScore >= 80 ? 'positive' : 'warning',
      icon:  'profile',
      tone:  'red',
    },
  ]

  return (
    <div className="flex flex-col gap-space-5">
      <WebDashHero
        prenom={session.prenom ?? ''}
        candidaturesEnCours={counts.candidatures}
        oppsRecommandees={mockRecoOpps.length}
        joursAvantCloture={3}
      />

      <WebDashKPIs items={kpis} />

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-space-5">
        {/* Colonne principale (desktop ≥ lg) */}
        <div className="flex flex-col gap-space-5 min-w-0">
          <OpportunitesRecoCarousel items={mockRecoOpps} />

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
            <WebDashTracker items={mockTracker} />
          </section>
        </div>

        {/* Colonne aside (desktop ≥ lg) */}
        <aside className="flex flex-col gap-space-4 min-w-0">
          <WebDashCenters items={mockCenters} />
          <WebDashEvents items={mockEvents} />
          <WebDashProfileNudge completionScore={completionScore} />
          <WebDashYayePanel />
        </aside>
      </div>
    </div>
  )
}
