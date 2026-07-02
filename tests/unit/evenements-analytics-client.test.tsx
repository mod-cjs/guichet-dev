import { render, screen } from '@testing-library/react'
import { EvenementsAnalyticsClient } from '@/app/admin/analytics/evenements/evenements-analytics-client'
import type { EvenementsAnalytics } from '@/lib/loaders/evenements-analytics'

const ANALYTICS: EvenementsAnalytics = {
  totalEvenements: 12,
  parType: [{ key: 'Formation', count: 8 }, { key: 'Atelier', count: 4 }],
  parStatut: [{ key: 'termine', count: 7 }, { key: 'a_venir', count: 5 }],
  totalInscriptions: 240,
  inscriptionsParStatut: [{ key: 'present', count: 90 }, { key: 'inscrit', count: 120 }],
  presents: 90,
  confirmes: 210,
  tauxPresence: 90 / 210,
  participantsUniques: 175,
  capaciteTotale: 400,
  tauxRemplissage: 210 / 400,
  topCentres: [{ centreNom: 'Dakar', evenements: 6, inscriptions: 120 }],
  parMois: [{ mois: '2026-03', evenements: 12 }],
}

const FILTRES = { from: '2026-01-01T00:00:00.000Z', to: '2026-03-31T00:00:00.000Z', centreIds: [] }

describe('GUIC-472 — EvenementsAnalyticsClient', () => {
  it('affiche le titre et le sous-titre de découplage', () => {
    render(<EvenementsAnalyticsClient analytics={ANALYTICS} centres={[]} filtres={FILTRES} />)
    expect(screen.getByRole('heading', { name: /analytics événements/i })).toBeInTheDocument()
    expect(screen.getByText(/distinct de la fréquentation/i)).toBeInTheDocument()
  })

  it('affiche les KPI (événements, inscriptions, taux de présence)', () => {
    render(<EvenementsAnalyticsClient analytics={ANALYTICS} centres={[]} filtres={FILTRES} />)
    expect(screen.getByText('12')).toBeInTheDocument()
    expect(screen.getByText('240')).toBeInTheDocument()
    expect(screen.getByText('43%')).toBeInTheDocument() // 90/210 arrondi
    expect(screen.getByText(/175 participants uniques/)).toBeInTheDocument()
  })

  it('propose un lien d\'export CSV avec la période', () => {
    render(<EvenementsAnalyticsClient analytics={ANALYTICS} centres={[]} filtres={FILTRES} />)
    const link = screen.getByRole('link', { name: /exporter csv/i })
    expect(link.getAttribute('href')).toContain('/api/admin/analytics/evenements/export?')
    expect(link.getAttribute('href')).toContain('from=2026-01-01')
  })
})
