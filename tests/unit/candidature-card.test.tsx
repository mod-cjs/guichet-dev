import { render, screen, within } from '@testing-library/react'
import { CandidatureCard, iconMetierFor } from '@/components/candidatures/CandidatureCard'
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

// ─────────────────────────────────────────────────────────────────────────────
// GUIC-252 — différenciation par état (tile + bloc contextuel + CTA)
// ─────────────────────────────────────────────────────────────────────────────

describe('iconMetierFor() — mapping type → icône (GUIC-252)', () => {
  it('mappe chaque type métier à une icône du sprite global', () => {
    expect(iconMetierFor('Stage')).toBe('employment')
    expect(iconMetierFor('Emploi')).toBe('employment')
    expect(iconMetierFor('Bourse')).toBe('funding')
    expect(iconMetierFor('Concours')).toBe('trending')
    expect(iconMetierFor('Formation')).toBe('learning')
  })
})

describe('<CandidatureCard /> — tile icône métier (GUIC-252)', () => {
  it('rend un tile carré 48 px avec l\'icône déduite du type', () => {
    render(<CandidatureCard item={make({ type: 'Bourse' })} />)
    const tile = screen.getByTestId('candidature-tile')
    expect(tile).toBeInTheDocument()
    expect(tile.className).toMatch(/w-12/)
    expect(tile.className).toMatch(/h-12/)
    expect(tile.querySelector('use')?.getAttribute('href')).toBe('/icons.svg#i-funding')
  })

  it('prop `iconMetier` override prioritaire sur le type', () => {
    render(<CandidatureCard item={make({ type: 'Stage' })} iconMetier="agriculture" />)
    const tile = screen.getByTestId('candidature-tile')
    expect(tile.querySelector('use')?.getAttribute('href')).toBe('/icons.svg#i-agriculture')
  })
})

describe('<CandidatureCard /> — bloc contextuel par état (GUIC-252)', () => {
  it('Brouillon : bloc jaune "Documents manquants" + CTA Reprendre', () => {
    render(<CandidatureCard item={make({ id: 'c-x', currentStep: 'Brouillon' })} />)
    const block = screen.getByTestId('candidature-contextual-block')
    expect(block).toHaveAttribute('role', 'status')
    expect(block.className).toMatch(/bg-gj-yellow-soft/)
    expect(within(block).getByText(/Documents manquants/i)).toBeInTheDocument()
    const cta = screen.getByTestId('candidature-contextual-cta')
    expect(cta).toHaveTextContent(/Reprendre/i)
    expect(cta).toHaveAttribute('href', '/jeune/mes-candidatures/c-x')
  })

  it('Envoyee : aucun bloc contextuel, lien Voir le détail seul', () => {
    render(<CandidatureCard item={make({ currentStep: 'Envoyee' })} />)
    expect(screen.queryByTestId('candidature-contextual-block')).toBeNull()
    expect(screen.queryByTestId('candidature-contextual-cta')).toBeNull()
    expect(screen.getByRole('link', { name: /Voir le détail/i })).toBeInTheDocument()
  })

  it('EnRevue : aucun bloc contextuel (silencieux)', () => {
    render(<CandidatureCard item={make({ currentStep: 'EnRevue' })} />)
    expect(screen.queryByTestId('candidature-contextual-block')).toBeNull()
  })

  it('Entretien : bloc bleu "Entretien planifié" + CTA Préparer', () => {
    render(<CandidatureCard item={make({ currentStep: 'Entretien' })} />)
    const block = screen.getByTestId('candidature-contextual-block')
    expect(block.className).toMatch(/bg-gj-blue-soft/)
    expect(within(block).getByText(/Entretien planifié/i)).toBeInTheDocument()
    expect(screen.getByTestId('candidature-contextual-cta')).toHaveTextContent(/Préparer/i)
  })

  it('Decision/Acceptee : bloc vert + CTA prochaines étapes', () => {
    render(
      <CandidatureCard item={make({ currentStep: 'Decision', decision: 'Acceptee' })} />,
    )
    const block = screen.getByTestId('candidature-contextual-block')
    expect(block.className).toMatch(/bg-gj-green-soft/)
    expect(within(block).getByText(/Bravo/i)).toBeInTheDocument()
    expect(screen.getByTestId('candidature-contextual-cta')).toHaveTextContent(/prochaines étapes/i)
  })

  it('Decision/Refusee : bloc rouge + CTA opportunités similaires vers /opportunites', () => {
    render(
      <CandidatureCard item={make({ currentStep: 'Decision', decision: 'Refusee' })} />,
    )
    const block = screen.getByTestId('candidature-contextual-block')
    expect(block.className).toMatch(/bg-gj-red-soft/)
    expect(within(block).getByText(/non retenue/i)).toBeInTheDocument()
    const cta = screen.getByTestId('candidature-contextual-cta')
    expect(cta).toHaveTextContent(/similaires/i)
    expect(cta).toHaveAttribute('href', '/opportunites')
  })
})
