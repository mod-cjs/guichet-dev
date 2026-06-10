/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { CentreOpenDot } from '@/components/centres/CentreOpenDot'

describe('<CentreOpenDot />', () => {
  it('expose aria-label="Ouvert" si open=true', () => {
    render(<CentreOpenDot open={true} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Ouvert')
  })

  it('expose aria-label="Fermé" si open=false', () => {
    render(<CentreOpenDot open={false} />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Fermé')
  })

  it('honore la prop `label` (override aria-label)', () => {
    render(<CentreOpenDot open={true} label="Ouvert jusqu’à 18h" />)
    expect(screen.getByRole('status')).toHaveAttribute('aria-label', 'Ouvert jusqu’à 18h')
  })

  it('applique la classe bg-gj-teal si ouvert', () => {
    render(<CentreOpenDot open={true} />)
    expect(screen.getByRole('status').className).toMatch(/bg-gj-teal/)
  })

  it('applique la classe bg-gj-red si fermé', () => {
    render(<CentreOpenDot open={false} />)
    expect(screen.getByRole('status').className).toMatch(/bg-gj-red/)
  })
})
