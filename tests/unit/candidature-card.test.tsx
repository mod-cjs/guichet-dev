import { render, screen } from '@testing-library/react'
import { CandidatureCard } from '@/components/candidatures/CandidatureCard'
import type { CandidatureMock } from '@/components/candidatures'

function make(over: Partial<CandidatureMock> = {}): CandidatureMock {
  return {
    id: 'c-1',
    opportuniteSlug: 'stage-data-sonatel',
    opportuniteTitre: 'Stage Data — Sonatel',
    organisation: 'Sonatel',
    type: 'Stage',
    currentStep: 'Envoyee',
    decision: null,
    envoyeeA: '2026-05-25T10:00:00.000Z',
    ...over,
  }
}

describe('<CandidatureCard />', () => {
  it('rend titre, organisation, type', () => {
    render(<CandidatureCard item={make()} />)
    expect(screen.getByRole('heading', { level: 3 })).toHaveTextContent('Stage Data — Sonatel')
    expect(screen.getByText('Sonatel')).toBeInTheDocument()
    expect(screen.getByText('Stage')).toBeInTheDocument()
  })

  it('affiche pill "Envoyée" quand currentStep=Envoyee', () => {
    render(<CandidatureCard item={make({ currentStep: 'Envoyee' })} />)
    expect(screen.getByTestId('candidature-status-pill')).toHaveTextContent('Envoyée')
  })

  it('affiche pill "Acceptée" pour décision acceptée', () => {
    render(
      <CandidatureCard item={make({ currentStep: 'Decision', decision: 'Acceptee' })} />,
    )
    expect(screen.getByTestId('candidature-status-pill')).toHaveTextContent('Acceptée')
  })

  it('affiche pill "Refusée" pour décision refusée', () => {
    render(
      <CandidatureCard item={make({ currentStep: 'Decision', decision: 'Refusee' })} />,
    )
    expect(screen.getByTestId('candidature-status-pill')).toHaveTextContent('Refusée')
  })

  it('affiche pill "Brouillon" et label "Modifié le …" pour brouillon', () => {
    render(<CandidatureCard item={make({ currentStep: 'Brouillon' })} />)
    expect(screen.getByTestId('candidature-status-pill')).toHaveTextContent('Brouillon')
    expect(screen.getByText(/Modifié le/i)).toBeInTheDocument()
  })

  it('lien "Voir le détail" pointe vers /jeune/mes-candidatures/:id', () => {
    render(<CandidatureCard item={make({ id: 'abc-42' })} />)
    const link = screen.getByRole('link', { name: /voir le détail/i })
    expect(link).toHaveAttribute('href', '/jeune/mes-candidatures/abc-42')
  })

  it('inclut le stepper progressbar', () => {
    render(<CandidatureCard item={make()} />)
    expect(screen.getByRole('progressbar')).toBeInTheDocument()
  })
})
