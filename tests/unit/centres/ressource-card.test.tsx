/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { RessourceCard } from '@/components/centres/RessourceCard'

const BASE = {
  id: 'r1',
  type: 'Salle',
  nom: 'Salle A',
  description: 'Salle équipée vidéo-projecteur.',
  capacite: 8,
  capaciteUnit: 'personnes',
  dureeMinCreneauMin: 60,
  requiresJustif: false,
  estActive: true,
}

describe('<RessourceCard />', () => {
  it('rend le nom, la description et le label type', () => {
    render(<RessourceCard ressource={BASE} centreSlug="cjs-tba" />)
    expect(screen.getByText('Salle A')).toBeInTheDocument()
    expect(screen.getByText(/Salle équipée/)).toBeInTheDocument()
    expect(screen.getByText(/Salle ·/)).toBeInTheDocument()
  })

  it('affiche le badge Gratuit', () => {
    render(<RessourceCard ressource={BASE} centreSlug="cjs-tba" />)
    expect(screen.getByText('Gratuit')).toBeInTheDocument()
  })

  it('affiche la chip "Justif requis" si requiresJustif', () => {
    render(
      <RessourceCard
        ressource={{ ...BASE, requiresJustif: true }}
        centreSlug="cjs-tba"
      />,
    )
    expect(screen.getByText('Justif requis')).toBeInTheDocument()
  })

  it('pointe le CTA Réserver vers la bonne URL', () => {
    render(<RessourceCard ressource={BASE} centreSlug="cjs-tba" />)
    const link = screen.getByRole('link', { name: /Réserver Salle A/i })
    expect(link).toHaveAttribute(
      'href',
      '/centres/cjs-tba/ressources/r1/reserver',
    )
  })

  it('icon différent selon le type (Vehicule -> car)', () => {
    const { container } = render(
      <RessourceCard
        ressource={{ ...BASE, type: 'Vehicule' }}
        centreSlug="cjs-tba"
      />,
    )
    expect(container.querySelector('use[href*="i-car"]')).toBeTruthy()
  })
})
