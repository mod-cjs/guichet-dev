import { render, screen } from '@testing-library/react'
import { AdminStatsClient, type AdminStatsData } from '@/app/admin/statistiques/AdminStatsClient'

const DATA: AdminStatsData = {
  growthLabels: ['Nov', 'Déc', 'Jan', 'Fév', 'Mar', 'Avr', 'Mai'],
  growthValues: [3000, 3400, 3850, 4120, 4480, 4690, 4872],
  candidatures: [
    { m: 'Jan', v: 120 },
    { m: 'Fév', v: 180 },
    { m: 'Mar', v: 240 },
  ],
  accountSplit: [
    { label: 'Bénéficiaires', value: 4872, color: 'var(--gj-teal)' },
    { label: 'Conseillers', value: 58, color: 'var(--gj-teal-deep)' },
  ],
  byRegion: [
    { m: 'Dakar', v: 12840 },
    { m: 'Thiès', v: 6210 },
  ],
  totalComptes: 5342,
}

describe('GUIC-456 — AdminStatsClient (Lot 11)', () => {
  it('affiche le titre et le bouton export', () => {
    render(<AdminStatsClient data={DATA} />)
    expect(screen.getByRole('heading', { name: /statistiques/i })).toBeInTheDocument()
    expect(screen.getByText(/Exporter/i)).toBeInTheDocument()
  })

  it('affiche les 4 cartes graphiques (par titre)', () => {
    render(<AdminStatsClient data={DATA} />)
    expect(screen.getByText(/Inscriptions cumulées/i)).toBeInTheDocument()
    expect(screen.getByText(/Candidatures par mois/i)).toBeInTheDocument()
    expect(screen.getByText(/Comptes par rôle/i)).toBeInTheDocument()
    expect(screen.getByText(/par région/i)).toBeInTheDocument()
  })

  it('affiche la légende du donut (comptes utilisateurs fiables)', () => {
    render(<AdminStatsClient data={DATA} />)
    expect(screen.getByText('Bénéficiaires')).toBeInTheDocument()
    expect(screen.getByText('Conseillers')).toBeInTheDocument()
  })

  it('expose les exports admin session-gated (données réelles, C3)', () => {
    render(<AdminStatsClient data={DATA} />)
    // Routes /api/admin/export/* (garde de session) et non /api/v1/export/* (clé Data Hub).
    expect(screen.getByRole('link', { name: /utilisateurs/i })).toHaveAttribute(
      'href',
      '/api/admin/export/utilisateurs',
    )
    expect(screen.getByRole('link', { name: /opportunités/i })).toHaveAttribute(
      'href',
      '/api/admin/export/opportunites',
    )
  })

  it('ne propose PLUS Formations / Programmes (jeux de données vides — C3)', () => {
    render(<AdminStatsClient data={DATA} />)
    expect(screen.queryByRole('link', { name: /formations/i })).toBeNull()
    expect(screen.queryByRole('link', { name: /programmes/i })).toBeNull()
  })
})
