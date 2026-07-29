/**
 * GUIC-451/679 — AdminDashboardClient (tableau de bord poussé : task-first + funnel héros).
 */
import { render, screen } from '@testing-library/react'
import { AdminDashboardClient } from '@/app/admin/tableau-de-bord/AdminDashboardClient'
import type { AdminDashboardData } from '@/lib/loaders/admin-dashboard'
import type { DashboardFilters } from '@/lib/dashboard-filters'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
jest.mock('@/components/centres/CentresMapGoogle', () => ({
  CentresMapGoogle: ({ centresForList }: { centresForList: { nom: string }[] }) => (
    <div data-testid="centres-map">{centresForList.map((c) => c.nom).join(', ')}</div>
  ),
}))

const FILTERS: DashboardFilters = { periode: '12mois', region: 'all' }

const DATA: AdminDashboardData = {
  briefing: [
    { key: 'moderation', count: 4, context: 'la plus ancienne attend 5 j (SLA < 48 h dépassé)', tone: 'crit', href: '/admin/opportunites', cta: 'Traiter la file' },
    { key: 'escalades', count: 3, context: '1 signalée(s) DANGER — à reprendre en priorité', tone: 'crit', href: '/admin/yaye/escalades', cta: 'Voir les escalades' },
    { key: 'curation', count: 8, context: 'la plus ancienne depuis 8 j', tone: 'info', href: '/admin/curation', cta: 'Ouvrir la file' },
  ],
  funnel: [
    { key: 'recue', label: 'Reçues', count: 200, pctOfTop: 1, conversion: null, dropoff: false },
    { key: 'preselection', label: 'Présélection', count: 144, pctOfTop: 0.72, conversion: 0.72, dropoff: false },
    { key: 'entretien', label: 'Entretien', count: 100, pctOfTop: 0.5, conversion: 0.69, dropoff: false },
    { key: 'retenue', label: 'Retenues', count: 28, pctOfTop: 0.14, conversion: 0.28, dropoff: true },
    { key: 'insertion', label: 'Insertion', count: 22, pctOfTop: 0.11, conversion: 0.79, dropoff: false },
  ],
  funnelConversion: 11,
  kpis: [
    { key: 'jeunes', label: 'Jeunes inscrits', value: '20 593', delta: '+12 ce mois', deltaUp: true },
    { key: 'offres', label: 'Offres publiées', value: '41' },
    { key: 'insertions', label: 'Insertions ce mois', value: '22', delta: '11% du parcours', deltaUp: true },
    { key: 'partenaires', label: 'Partenaires vérifiés', value: '7' },
  ],
  centres: [
    { id: 'c1', nom: 'CJS Dakar', region: 'Dakar', slug: 'dakar', jeunes: 542, reservationsEnAttente: 3, frequentation30j: 40, insertions: 7 },
  ],
  centresGeo: [
    { id: 'c1', nom: 'CJS Dakar', latitude: 14.7, longitude: -17.4, region: 'Dakar', slug: 'dakar' },
    { id: 'c2', nom: 'CJS Thiès', latitude: 14.8, longitude: -16.9, region: 'Thies', slug: 'thies' },
  ],
  yaye: { escaladesOuvertes: 3, escaladesDanger: 1, autoResolution: 81, satisfaction: 82, sessions: 48, conversations: 9 },
  pulse: [{ action: 'opportunite.publiee', resume: 'Offre publiée', ago: "à l'instant" }],
  upcoming: [{ label: 'Atelier CV', when: '2 août', kind: 'evenement' }],
  oppByType: [
    { type: 'Emploi', label: 'Emploi', total: 9, aModerer: 1 },
    { type: 'Formation', label: 'Formation', total: 9, aModerer: 0 },
  ],
  regionScoped: false,
}

describe('GUIC-451/679 — AdminDashboardClient', () => {
  beforeEach(() => render(<AdminDashboardClient data={DATA} filters={FILTERS} />))

  it('affiche le titre "Tableau de bord national"', () => {
    expect(screen.getByRole('heading', { name: /tableau de bord national/i })).toBeInTheDocument()
  })

  it('briefing : les 3 priorités avec contexte actionnable', () => {
    expect(screen.getByText(/SLA < 48 h dépassé/i)).toBeInTheDocument()
    expect(screen.getByText(/DANGER — à reprendre en priorité/i)).toBeInTheDocument()
    expect(screen.getByText(/la plus ancienne depuis 8 j/i)).toBeInTheDocument()
  })

  it('briefing : Modération pointe /admin/opportunites', () => {
    expect(screen.getByRole('link', { name: /modération/i })).toHaveAttribute('href', '/admin/opportunites')
  })

  it('funnel : titre + conversion globale + étapes', () => {
    expect(screen.getByRole('heading', { name: /parcours des candidatures/i })).toBeInTheDocument()
    expect(screen.getByText(/11% du dépôt à l.insertion/i)).toBeInTheDocument()
    expect(screen.getByText('Présélection')).toBeInTheDocument()
  })

  it('funnel : surligne le POINT DE FUITE', () => {
    expect(screen.getByText(/point de fuite/i)).toBeInTheDocument()
  })

  it('KPIs requalifiés avec tendance', () => {
    expect(screen.getByText(/jeunes inscrits/i)).toBeInTheDocument()
    expect(screen.getByText(/insertions ce mois/i)).toBeInTheDocument()
    expect(screen.getByText(/partenaires vérifiés/i)).toBeInTheDocument()
    expect(screen.getByText(/\+12 ce mois/i)).toBeInTheDocument()
    // les KPIs redondants/ambigus ont été retirés
    expect(screen.queryByText(/centres actifs/i)).toBeNull()
    expect(screen.queryByText(/taux d.insertion/i)).toBeNull()
  })

  it('réseau : centres à suivre + carte géolocalisée', () => {
    expect(screen.getByRole('heading', { name: /centres à suivre/i })).toBeInTheDocument()
    expect(screen.getByText(/3 rés. en attente/i)).toBeInTheDocument()
    const map = screen.getByTestId('centres-map')
    expect(map).toHaveTextContent('CJS Dakar')
    expect(map).toHaveTextContent('CJS Thiès')
  })

  it('Yaye : auto-résolution + satisfaction + escalades danger', () => {
    expect(screen.getByText('81%')).toBeInTheDocument()
    expect(screen.getByText('82%')).toBeInTheDocument()
    expect(screen.getByText(/1 danger/i)).toBeInTheDocument()
  })

  it('opportunités par type (actionable)', () => {
    expect(screen.getByRole('heading', { name: /opportunités par type/i })).toBeInTheDocument()
    expect(screen.getByText('Emploi')).toBeInTheDocument()
  })

  it('pouls : activité récente + ce qui arrive', () => {
    expect(screen.getByRole('heading', { name: /activité récente/i })).toBeInTheDocument()
    expect(screen.getByText('Offre publiée')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /ce qui arrive/i })).toBeInTheDocument()
    expect(screen.getByText('Atelier CV')).toBeInTheDocument()
  })
})

describe('GUIC-679 — briefing vide', () => {
  it('affiche "rien ne requiert ton attention"', () => {
    render(<AdminDashboardClient data={{ ...DATA, briefing: [] }} filters={FILTERS} />)
    expect(screen.getByText(/rien ne requiert ton attention/i)).toBeInTheDocument()
  })
})
