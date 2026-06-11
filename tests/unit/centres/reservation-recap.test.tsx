/** @jest-environment jsdom */
import { render, screen } from '@testing-library/react'
import { ReservationRecap } from '@/components/centres/ReservationRecap'

describe('<ReservationRecap />', () => {
  it('rend les lignes key-value de base', () => {
    render(
      <ReservationRecap
        ressource={{ nom: 'Salle A', type: 'Salle' }}
        centre={{ nom: 'CJS Tambacounda' }}
        date={new Date('2026-07-15T12:00:00Z')}
        slot="14:00-16:00"
        people={6}
      />,
    )
    expect(screen.getByText('Salle A')).toBeInTheDocument()
    expect(screen.getByText('CJS Tambacounda')).toBeInTheDocument()
    expect(screen.getByText('6')).toBeInTheDocument()
    expect(screen.getByText('Gratuit')).toBeInTheDocument()
  })

  it('formate le créneau en HHh', () => {
    render(
      <ReservationRecap
        ressource={{ nom: 'X', type: 'Salle' }}
        centre={{ nom: 'C' }}
        date={null}
        slot="08:00-10:00"
        people={1}
      />,
    )
    expect(screen.getByText(/08h00 – 10h00/)).toBeInTheDocument()
  })

  it('affiche les placeholders quand date/slot null', () => {
    render(
      <ReservationRecap
        ressource={{ nom: 'X', type: 'Salle' }}
        centre={{ nom: 'C' }}
        date={null}
        slot={null}
        people={1}
      />,
    )
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(2)
  })
})
