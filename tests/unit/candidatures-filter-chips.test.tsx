import { render, screen, fireEvent } from '@testing-library/react'
import { CandidaturesFilterChips } from '@/components/candidatures/CandidaturesFilterChips'

const counts = {
  all: 5,
  Brouillon: 1,
  Envoyee: 1,
  EnRevue: 1,
  Entretien: 1,
  Decision: 1,
}

describe('<CandidaturesFilterChips />', () => {
  it('rend une chip par filtre + compteur', () => {
    render(<CandidaturesFilterChips active="all" counts={counts} onChange={() => {}} />)
    const group = screen.getByRole('group', { name: /filtrer les candidatures/i })
    expect(group).toBeInTheDocument()
    expect(screen.getByText('Toutes')).toBeInTheDocument()
    expect(screen.getByText('Envoyée')).toBeInTheDocument()
    expect(screen.getByText('Décision')).toBeInTheDocument()
  })

  it('marque la chip active avec aria-pressed=true', () => {
    render(<CandidaturesFilterChips active="Envoyee" counts={counts} onChange={() => {}} />)
    const chip = screen.getByRole('button', { name: /Envoyée/i, pressed: true })
    expect(chip).toBeInTheDocument()
  })

  it('appelle onChange avec le filtre cliqué', () => {
    const spy = jest.fn()
    render(<CandidaturesFilterChips active="all" counts={counts} onChange={spy} />)
    fireEvent.click(screen.getByRole('button', { name: /En revue/i }))
    expect(spy).toHaveBeenCalledWith('EnRevue')
  })
})
