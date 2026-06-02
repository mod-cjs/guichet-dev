/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { AtelierCarousel } from '@/components/centres/AtelierCarousel'
import { MOCK_ATELIERS } from '@/components/centres/mock-data'

describe('<AtelierCarousel />', () => {
  it('rend tous les ateliers fournis', () => {
    render(<AtelierCarousel ateliers={MOCK_ATELIERS} />)
    MOCK_ATELIERS.forEach((a) => {
      expect(screen.getByText(a.titre)).toBeInTheDocument()
    })
  })

  it('expose un role=list accessible', () => {
    render(<AtelierCarousel ateliers={MOCK_ATELIERS} />)
    expect(screen.getByRole('list', { name: /Ateliers à venir/i })).toBeInTheDocument()
  })

  it('appelle onInscrire avec l\'id de l\'atelier au clic', () => {
    const fn = jest.fn()
    render(<AtelierCarousel ateliers={MOCK_ATELIERS} onInscrire={fn} />)
    const first = MOCK_ATELIERS[0]
    fireEvent.click(screen.getByRole('button', { name: new RegExp(first.titre) }))
    expect(fn).toHaveBeenCalledWith(first.id)
  })
})
