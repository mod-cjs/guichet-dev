/**
 * GUIC-689 (É-14) — Ce test portait sur les six puces d'étapes du pipeline.
 * Le regroupement par intention les remplace par cinq groupes ; les assertions
 * suivent, l'intention du test (une puce par filtre, état pressé, remontée du
 * clic) est inchangée.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { CandidaturesFilterChips } from '@/components/candidatures/CandidaturesFilterChips'

const counts = {
  all: 5,
  Brouillons: 1,
  EnCours: 2,
  Entretiens: 1,
  Cloturees: 1,
}

describe('<CandidaturesFilterChips />', () => {
  it('rend une chip par groupe + compteur', () => {
    render(<CandidaturesFilterChips active="all" counts={counts} onChange={() => {}} />)
    const group = screen.getByRole('group', { name: /filtrer les candidatures/i })
    expect(group).toBeInTheDocument()
    expect(screen.getByText('Toutes')).toBeInTheDocument()
    expect(screen.getByText('En cours')).toBeInTheDocument()
    expect(screen.getByText('Clôturées')).toBeInTheDocument()
  })

  it('n’expose plus le vocabulaire technique du pipeline', () => {
    render(<CandidaturesFilterChips active="all" counts={counts} onChange={() => {}} />)
    expect(screen.queryByText('En revue')).toBeNull()
    expect(screen.queryByText('Décision')).toBeNull()
    expect(screen.queryByText('Envoyée')).toBeNull()
  })

  it('marque la chip active avec aria-pressed=true', () => {
    render(<CandidaturesFilterChips active="EnCours" counts={counts} onChange={() => {}} />)
    const chip = screen.getByRole('button', { name: /En cours/i, pressed: true })
    expect(chip).toBeInTheDocument()
  })

  it('appelle onChange avec le groupe cliqué', () => {
    const spy = jest.fn()
    render(<CandidaturesFilterChips active="all" counts={counts} onChange={spy} />)
    fireEvent.click(screen.getByRole('button', { name: /Clôturées/i }))
    expect(spy).toHaveBeenCalledWith('Cloturees')
  })
})
