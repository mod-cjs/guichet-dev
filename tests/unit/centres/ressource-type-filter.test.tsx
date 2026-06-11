/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { RessourceTypeFilter } from '@/components/centres/RessourceTypeFilter'

describe('<RessourceTypeFilter />', () => {
  it('expose role="radiogroup" + 4 chips', () => {
    render(<RessourceTypeFilter value="Toutes" onChange={() => {}} />)
    expect(screen.getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.getAllByRole('radio')).toHaveLength(4)
  })

  it('marque le chip actif aria-checked="true"', () => {
    render(<RessourceTypeFilter value="Vehicule" onChange={() => {}} />)
    expect(
      screen.getByRole('radio', { name: /Véhicules/ }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('appelle onChange sur clic', () => {
    const fn = jest.fn()
    render(<RessourceTypeFilter value="Toutes" onChange={fn} />)
    fireEvent.click(screen.getByRole('radio', { name: /Salles/ }))
    expect(fn).toHaveBeenCalledWith('Salle')
  })

  it('affiche compteurs si counts fourni', () => {
    render(
      <RessourceTypeFilter
        value="Toutes"
        onChange={() => {}}
        counts={{ Salle: 2, Vehicule: 1, Poste_info: 4 }}
      />,
    )
    expect(screen.getByRole('radio', { name: /Salles/ })).toHaveTextContent('(2)')
  })
})
