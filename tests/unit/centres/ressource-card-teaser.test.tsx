/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { RessourceCardTeaser } from '@/components/centres/RessourceCardTeaser'

const baseRessource = {
  id: 'r1',
  type: 'Salle' as const,
  nom: 'Salle de réunion A',
  capacite: 8,
  capaciteUnit: 'personnes',
  estActive: true,
}

describe('<RessourceCardTeaser />', () => {
  it('affiche nom + capacité formatée', () => {
    render(
      <RessourceCardTeaser
        ressource={baseRessource}
        centreSlug="cjs-tambacounda"
      />,
    )
    expect(screen.getByText('Salle de réunion A')).toBeInTheDocument()
    expect(screen.getByText(/8 personnes/i)).toBeInTheDocument()
    // "Salle" apparaît dans le nom + badge type → on accepte ≥ 1 occurrence.
    expect(screen.getAllByText(/Salle/i).length).toBeGreaterThanOrEqual(1)
  })

  it('rend un lien "Réserver" vers la sous-route W4', () => {
    render(
      <RessourceCardTeaser
        ressource={baseRessource}
        centreSlug="cjs-tambacounda"
      />,
    )
    const link = screen.getByRole('link', { name: /Réserver/i })
    expect(link).toHaveAttribute(
      'href',
      '/centres/cjs-tambacounda/ressources/r1/reserver',
    )
  })

  it('appelle onReserveClick', () => {
    const fn = jest.fn()
    render(
      <RessourceCardTeaser
        ressource={baseRessource}
        centreSlug="cjs-tambacounda"
        onReserveClick={fn}
      />,
    )
    fireEvent.click(screen.getByRole('link', { name: /Réserver/i }))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('utilise un libellé différent par type', () => {
    render(
      <RessourceCardTeaser
        centreSlug="x"
        ressource={{
          ...baseRessource,
          type: 'Vehicule',
          nom: 'Pick-up',
          capaciteUnit: 'places',
          capacite: 4,
        }}
      />,
    )
    expect(screen.getByText(/Véhicule/i)).toBeInTheDocument()
    expect(screen.getByText(/4 places/i)).toBeInTheDocument()
  })
})
