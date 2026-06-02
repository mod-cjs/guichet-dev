/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { CentresMap } from '@/components/centres/CentresMap'
import { MOCK_CENTRES } from '@/components/centres/mock-data'

describe('<CentresMap />', () => {
  it('rend un pin par centre (limité aux positions disponibles)', () => {
    const { container } = render(<CentresMap centres={MOCK_CENTRES} />)
    const pins = container.querySelectorAll('[data-testid^="map-pin-"]')
    // 4 positions max, 4 centres mock
    expect(pins.length).toBe(Math.min(MOCK_CENTRES.length, 4))
  })

  it('affiche le label bubble du centre highlight', () => {
    const primary = MOCK_CENTRES.find((c) => c.isPrimary)!
    render(<CentresMap centres={MOCK_CENTRES} highlightId={primary.id} />)
    expect(screen.getByText(new RegExp(primary.nom))).toBeInTheDocument()
  })

  it('appelle onRecenter au clic sur le bouton', () => {
    const fn = jest.fn()
    render(<CentresMap centres={MOCK_CENTRES} onRecenter={fn} />)
    fireEvent.click(screen.getByRole('button', { name: /Recentrer/i }))
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it('expose role=img pour l\'a11y', () => {
    render(<CentresMap centres={MOCK_CENTRES} />)
    expect(screen.getByLabelText(/Carte indicative/i)).toBeInTheDocument()
  })
})
