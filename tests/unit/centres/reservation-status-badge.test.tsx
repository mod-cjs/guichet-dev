/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { ReservationStatusBadge } from '@/components/centres/ReservationStatusBadge'

describe('<ReservationStatusBadge />', () => {
  it('rend le label "Confirmée" pour Acceptee', () => {
    render(<ReservationStatusBadge statut="Acceptee" />)
    expect(screen.getByText('Confirmée')).toBeInTheDocument()
  })

  it('expose un role=status accessible avec aria-label', () => {
    render(<ReservationStatusBadge statut="EnAttente" />)
    const el = screen.getByRole('status', { name: /En attente/ })
    expect(el).toBeInTheDocument()
    expect(el).toHaveAttribute('data-statut', 'EnAttente')
  })

  it('mappe NonHonoree → "Non honorée"', () => {
    render(<ReservationStatusBadge statut="NonHonoree" />)
    expect(screen.getByText('Non honorée')).toBeInTheDocument()
  })
})
