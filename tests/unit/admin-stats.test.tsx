import { render, screen } from '@testing-library/react'
import { AdminStatsClient, type AdminStatsData } from '@/app/admin/data-hub/AdminStatsClient'

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
    { label: 'Conseillers', value: 58, color: 'var(--gj-blue-ink)' },
    { label: 'Recruteurs', value: 412, color: 'var(--gj-yellow)' },
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

  it('affiche la légende du donut (rôles + valeurs)', () => {
    render(<AdminStatsClient data={DATA} />)
    expect(screen.getByText('Bénéficiaires')).toBeInTheDocument()
    expect(screen.getByText('Conseillers')).toBeInTheDocument()
    expect(screen.getByText('Recruteurs')).toBeInTheDocument()
  })

  it('expose des liens d\'export vers les routes existantes', () => {
    render(<AdminStatsClient data={DATA} />)
    const link = screen.getByRole('link', { name: /utilisateurs/i })
    expect(link).toHaveAttribute('href', '/api/v1/export/utilisateurs')
  })
})
