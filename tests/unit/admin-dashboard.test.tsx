/**
 * GUIC-451 — Tableau de bord admin Lot 11 (sombre + doré)
 * TDD strict : RED d'abord, puis GREEN après implémentation.
 *
 * On teste uniquement le composant client (AdminDashboardClient) avec
 * des données mockées — les appels Prisma serveur ne sont pas couverts ici.
 */
import { render, screen } from '@testing-library/react'
import { AdminDashboardClient } from '@/app/admin/tableau-de-bord/AdminDashboardClient'
import type { DashboardData } from '@/app/admin/tableau-de-bord/AdminDashboardClient'

// ── Mock next/navigation (AdminDashboardClient peut importer des liens) ────
jest.mock('next/navigation', () => ({
  usePathname: () => '/admin/tableau-de-bord',
  useRouter: () => ({ push: jest.fn() }),
}))

// ── Mock Icon (SVG sprite non disponible dans jsdom) ──────────────────────
jest.mock('@/components/ui/Icon', () => ({
  Icon: ({ name, title }: { name: string; title?: string }) => (
    <svg data-testid={`icon-${name}`} aria-label={title ?? name} />
  ),
}))

// ── Mock CentresMapGoogle (Google Maps JS API indispo en jsdom) ───────────
jest.mock('@/components/centres/CentresMapGoogle', () => ({
  CentresMapGoogle: ({ centres }: { centres: { id: string; nom: string }[] }) => (
    <div data-testid="centres-map">{centres.map((c) => c.nom).join(', ')}</div>
  ),
}))

const MOCK_DATA: DashboardData = {
  kpis: {
    jeunesInscrits: 22_400,
    centresActifs: 14,
    aModerer: 5,
    insertionsMois: 120,
    jeunesNouveauxMois: 1240,
    insertionsDeltaPct: 12,
  },
  growthSeries: [
    { month: 'Nov', cumulative: 12000 },
    { month: 'Déc', cumulative: 14000 },
    { month: 'Jan', cumulative: 16000 },
    { month: 'Fév', cumulative: 18000 },
    { month: 'Mar', cumulative: 20000 },
    { month: 'Avr', cumulative: 21000 },
    { month: 'Mai', cumulative: 22400 },
  ],
  accountSplit: [
    { label: 'Bénéficiaires', value: 20000, color: 'var(--gj-teal)' },
    { label: 'Conseillers', value: 1800, color: 'var(--gj-teal-deep)' },
    { label: 'Recruteurs', value: 600, color: 'var(--gj-blue)' },
  ],
  monthlyCandidatures: [
    { m: 'Nov', v: 80 },
    { m: 'Déc', v: 95 },
    { m: 'Jan', v: 110 },
    { m: 'Fév', v: 100 },
    { m: 'Mar', v: 115 },
    { m: 'Avr', v: 118 },
    { m: 'Mai', v: 120 },
  ],
  centres: [
    { id: 'c1', nom: 'CJS Dakar', latitude: 14.69, longitude: -17.44, region: 'Dakar', slug: 'cjs-dakar' },
    { id: 'c2', nom: 'CJS Thiès', latitude: 14.79, longitude: -16.93, region: 'Thiès', slug: 'cjs-thies' },
  ],
  secondaires: [
    { label: "Taux d'insertion moyen", value: '61%', icon: 'trending' },
    { label: 'Candidatures (mois)', value: '4 312', icon: 'document' },
    { label: 'Ateliers tenus', value: '186', icon: 'calendar' },
    { label: 'Partenaires actifs', value: '412', icon: 'employment' },
  ],
}

describe('GUIC-451 — AdminDashboardClient', () => {
  beforeEach(() => {
    render(<AdminDashboardClient data={MOCK_DATA} />)
  })

  // ── Présence nationale (carte Google Maps) — GUIC-467 ──────────────────────
  it('affiche la carte « Présence nationale »', () => {
    expect(screen.getByRole('heading', { name: /présence nationale/i })).toBeInTheDocument()
  })

  it('passe les centres géolocalisés à la carte', () => {
    const map = screen.getByTestId('centres-map')
    expect(map).toHaveTextContent('CJS Dakar')
    expect(map).toHaveTextContent('CJS Thiès')
  })

  // ── Deltas KPI — GUIC-467 (F6) ─────────────────────────────────────────────
  it('affiche le delta « nouveaux ce mois » sous le KPI jeunes', () => {
    expect(screen.getByText(/\+1\s?240 ce mois/i)).toBeInTheDocument()
  })

  it('affiche le delta % des insertions vs mois dernier', () => {
    expect(screen.getByText(/\+12% vs mois dernier/i)).toBeInTheDocument()
  })

  // ── Indicateurs secondaires — GUIC-467 (F6) ────────────────────────────────
  it('affiche les indicateurs secondaires (taux insertion, candidatures, ateliers, partenaires)', () => {
    expect(screen.getByText(/taux d.insertion moyen/i)).toBeInTheDocument()
    expect(screen.getByText('61%')).toBeInTheDocument()
    expect(screen.getByText(/ateliers tenus/i)).toBeInTheDocument()
    expect(screen.getByText(/partenaires actifs/i)).toBeInTheDocument()
  })

  // ── Titre page ────────────────────────────────────────────────────────────
  it('affiche le titre "Tableau de bord national"', () => {
    expect(
      screen.getByRole('heading', { name: /tableau de bord national/i })
    ).toBeInTheDocument()
  })

  // ── 4 labels KPI ────────────────────────────────────────────────────────
  it('affiche le label KPI "Jeunes inscrits"', () => {
    expect(screen.getByText(/jeunes inscrits/i)).toBeInTheDocument()
  })

  it('affiche le label KPI "Centres actifs"', () => {
    expect(screen.getByText(/centres actifs/i)).toBeInTheDocument()
  })

  it('affiche le label KPI "À modérer"', () => {
    expect(screen.getByText(/à modérer/i)).toBeInTheDocument()
  })

  it('affiche le label KPI "Insertions ce mois"', () => {
    expect(screen.getByText(/insertions ce mois/i)).toBeInTheDocument()
  })

  // ── Valeurs KPI ───────────────────────────────────────────────────────────
  it('affiche la valeur KPI jeunes inscrits (22 400)', () => {
    // toLocaleString('fr-FR') utilise   (espace fine insécable) comme
    // séparateur de milliers — on matche avec une regex permissive.
    expect(screen.getByText(/22[ \s]?400/)).toBeInTheDocument()
  })

  it('affiche la valeur KPI centres actifs (14)', () => {
    // "14" apparaît au moins une fois
    expect(screen.getAllByText('14').length).toBeGreaterThan(0)
  })

  // ── Titres des cards charts ──────────────────────────────────────────────
  it('affiche la card "Croissance des inscriptions"', () => {
    expect(
      screen.getByRole('heading', { name: /croissance des inscriptions/i })
    ).toBeInTheDocument()
  })

  it('affiche la card "Répartition des comptes"', () => {
    expect(
      screen.getByRole('heading', { name: /répartition des comptes/i })
    ).toBeInTheDocument()
  })

  it('affiche la card "Insertions par mois"', () => {
    expect(
      screen.getByRole('heading', { name: /insertions par mois/i })
    ).toBeInTheDocument()
  })

  // ── Call-out modération ──────────────────────────────────────────────────
  it('affiche le call-out de modération', () => {
    // GUIC-461 : la KPI "À modérer" est désormais aussi un lien → plusieurs liens /modérer/.
    expect(screen.getAllByRole('link', { name: /modérer/i }).length).toBeGreaterThan(0)
  })

  it('tous les liens de modération pointent vers /admin/opportunites', () => {
    const links = screen.getAllByRole('link', { name: /modérer/i })
    expect(links.length).toBeGreaterThan(0)
    links.forEach((l) => expect(l).toHaveAttribute('href', '/admin/opportunites'))
  })

  // ── Légende Donut ────────────────────────────────────────────────────────
  it('affiche les labels de la légende Donut (Bénéficiaires, Conseillers, Recruteurs)', () => {
    expect(screen.getByText(/bénéficiaires/i)).toBeInTheDocument()
    expect(screen.getByText(/conseillers/i)).toBeInTheDocument()
    expect(screen.getByText(/recruteurs/i)).toBeInTheDocument()
  })

  // ── Prop typée : vérification que DashboardData est correctement accepté ──
  it('accepte une prop data typée DashboardData avec insertionsMois null → affiche "—"', () => {
    const dataAvecNull: DashboardData = {
      ...MOCK_DATA,
      kpis: { ...MOCK_DATA.kpis, insertionsMois: null },
    }
    render(<AdminDashboardClient data={dataAvecNull} />)
    // "—" doit être présent au moins une fois (KPI insertions → —)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})

// ── Tests unitaires des primitives SVG ──────────────────────────────────────

import { Spark } from '@/components/admin/charts/Spark'
import { LineChart } from '@/components/admin/charts/LineChart'
import { BarChart } from '@/components/admin/charts/BarChart'
import { Donut } from '@/components/admin/charts/Donut'

describe('GUIC-451 — Chart primitives SVG', () => {
  it('Spark — rend un <svg> sans erreur', () => {
    const { container } = render(<Spark data={[10, 20, 15, 30, 25]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('Spark — tolère un tableau à un seul élément', () => {
    const { container } = render(<Spark data={[42]} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('LineChart — rend un <svg> avec des données', () => {
    const { container } = render(
      <LineChart
        data={[100, 200, 300, 250, 400]}
        labels={['Jan', 'Fév', 'Mar', 'Avr', 'Mai']}
      />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('BarChart — rend un <svg> avec des données', () => {
    const { container } = render(
      <BarChart data={[{ m: 'Jan', v: 50 }, { m: 'Fév', v: 80 }]} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('Donut — rend un <svg> avec des segments', () => {
    const { container } = render(
      <Donut
        data={[
          { label: 'A', value: 300, color: 'var(--gj-teal)' },
          { label: 'B', value: 200, color: 'var(--gj-blue)' },
        ]}
        total={22400}
      />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
