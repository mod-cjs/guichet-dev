import { render, screen, fireEvent } from '@testing-library/react'
import {
  CandidaturesClient,
  CANDIDATURES_MOCK,
  type CandidatureMock,
} from '@/components/candidatures'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('<CandidaturesClient />', () => {
  it('rend le compteur de dossiers et la liste complète par défaut', () => {
    render(<CandidaturesClient items={CANDIDATURES_MOCK} />)
    expect(screen.getByTestId('candidatures-counter')).toHaveTextContent(
      `${CANDIDATURES_MOCK.length} dossiers`,
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(CANDIDATURES_MOCK.length)
  })

  it('filtre par étape EnRevue ne montre que les EnRevue', () => {
    render(<CandidaturesClient items={CANDIDATURES_MOCK} />)
    fireEvent.click(screen.getByRole('button', { name: /En revue/i }))
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(
      CANDIDATURES_MOCK.filter((c) => c.currentStep === 'EnRevue').length,
    )
  })

  it('empty state si liste vide globale', () => {
    render(<CandidaturesClient items={[]} />)
    expect(screen.getByText(/Pas encore de candidature/i)).toBeInTheDocument()
  })

  it('empty state filtre — message dédié + bouton "Voir toutes"', () => {
    const items: CandidatureMock[] = [
      {
        id: 'a',
        opportuniteSlug: 'a',
        opportuniteTitre: 'A',
        organisation: 'X',
        type: 'Stage',
        currentStep: 'Envoyee',
        decision: null,
        envoyeeA: '2026-05-30T00:00:00.000Z',
      },
    ]
    render(<CandidaturesClient items={items} />)
    fireEvent.click(screen.getByRole('button', { name: /Entretien/i }))
    expect(screen.getByTestId('candidatures-empty-filter')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Voir toutes/i }))
    expect(screen.getAllByRole('listitem')).toHaveLength(1)
  })

  it('affiche "1 dossier" (singulier) quand items.length === 1', () => {
    const items: CandidatureMock[] = [CANDIDATURES_MOCK[0]]
    render(<CandidaturesClient items={items} />)
    expect(screen.getByTestId('candidatures-counter')).toHaveTextContent('1 dossier')
  })
})
