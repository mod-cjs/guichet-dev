import { render, screen } from '@testing-library/react'

jest.mock('next/navigation', () => ({ useRouter: () => ({ push: jest.fn() }) }))

import { EvenementsAnalyticsClient } from '@/app/admin/analytics/evenements/evenements-analytics-client'
import type { EvenementsAnalytics } from '@/lib/loaders/evenements-analytics'

const ANALYTICS: EvenementsAnalytics = {
  totalEvenements: 12,
  parType: [{ key: 'Formation', count: 8 }, { key: 'Cours', count: 4 }],
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

describe('GUIC-472 — EvenementsAnalyticsClient (calqué sur analytics centres)', () => {
  it('affiche le titre et le sous-titre de découplage', () => {
    render(<EvenementsAnalyticsClient analytics={ANALYTICS} centres={[]} filtres={FILTRES} />)
    expect(screen.getByRole('heading', { name: /analytics événements/i })).toBeInTheDocument()
    expect(screen.getByText(/distinct de la fréquentation/i)).toBeInTheDocument()
  })

  it('affiche les KPI mère (Événements, Inscriptions, Taux de présence, remplissage)', () => {
    render(<EvenementsAnalyticsClient analytics={ANALYTICS} centres={[]} filtres={FILTRES} />)
    expect(screen.getByText('Événements')).toBeInTheDocument()
    expect(screen.getByText('Inscriptions')).toBeInTheDocument()
    expect(screen.getByText(/Taux de présence/)).toBeInTheDocument()
    expect(screen.getByText(/Taux de remplissage/)).toBeInTheDocument()
  })

  it('propose les filtres (période) et un export CSV', () => {
    render(<EvenementsAnalyticsClient analytics={ANALYTICS} centres={[]} filtres={FILTRES} />)
    expect(screen.getByText('Filtres')).toBeInTheDocument()
    const link = screen.getByRole('link', { name: /exporter csv/i })
    expect(link.getAttribute('href')).toContain('/api/admin/analytics/evenements/export?')
    expect(link.getAttribute('href')).toContain('from=2026-01-01')
  })
})
