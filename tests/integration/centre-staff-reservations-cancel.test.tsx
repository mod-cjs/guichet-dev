/**
 * GUIC-395 — Tests UI bouton "Annuler" sur la liste réservations staff centre.
 *
 * 2 tests :
 *  - rendu bouton si statut `Acceptee` ou `EnAttente`
 *  - masqué si statut non annulable (`Passee`, `AnnuleeParJeune`, etc.)
 */

jest.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: jest.fn(), push: jest.fn() }),
}))

import { render, screen } from '@testing-library/react'
import ReservationsListClient, {
  type StaffReservationRow,
} from '@/app/centre-staff/(protected)/reservations/reservations-list-client'

function row(overrides: Partial<StaffReservationRow> = {}): StaffReservationRow {
  return {
    id:           'r-1',
    creneauDebut: '09:00',
    creneauFin:   '11:00',
    statut:       'Acceptee',
    motif:        '...',
    utilisateur:  { nom: 'Diop', prenom: 'Awa' },
    ressource:    { nom: 'Salle A', type: 'Salle' },
    ...overrides,
  }
}

describe('ReservationsListClient — bouton Annuler', () => {
  it('rend un bouton Annuler quand statut Acceptee/EnAttente', () => {
    render(
      <ReservationsListClient
        centreId="c-1"
        reservations={[
          row({ id: 'r-a', statut: 'Acceptee' }),
          row({ id: 'r-b', statut: 'EnAttente' }),
        ]}
      />,
    )
    expect(screen.getByTestId('cancel-r-a')).toBeInTheDocument()
    expect(screen.getByTestId('cancel-r-b')).toBeInTheDocument()
    expect(screen.getAllByText('Annuler').length).toBe(2)
  })

  it('masque le bouton Annuler pour les statuts non annulables', () => {
    render(
      <ReservationsListClient
        centreId="c-1"
        reservations={[
          row({ id: 'r-c', statut: 'Passee' }),
          row({ id: 'r-d', statut: 'AnnuleeParJeune' }),
          row({ id: 'r-e', statut: 'Refusee' }),
        ]}
      />,
    )
    expect(screen.queryByTestId('cancel-r-c')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cancel-r-d')).not.toBeInTheDocument()
    expect(screen.queryByTestId('cancel-r-e')).not.toBeInTheDocument()
  })
})
