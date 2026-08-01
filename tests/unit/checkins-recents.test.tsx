/** @jest-environment jsdom */
/** GUIC-687 — sous-section « Check-ins récents » (onglet Fréquentation) : liste + recherche. */
import { render, screen, fireEvent } from '@testing-library/react'
import { CheckinsRecents, type CheckinRow } from '@/app/admin/centres/[id]/CheckinsRecents'

const CHECKINS: CheckinRow[] = [
  { id: 'c1', jeune: 'Awa Ndiaye', via: 'QR MyCJSCard', dwell: 'dwell 45 min', quand: 'il y a 12 min' },
  { id: 'c2', jeune: 'Modou Fall', via: 'Manuel (staff)', dwell: null, quand: 'il y a 40 min' },
]

describe('CheckinsRecents', () => {
  it('liste les check-ins avec source, dwell et temps relatif', () => {
    render(<CheckinsRecents checkins={CHECKINS} />)
    expect(screen.getByText('Awa Ndiaye')).toBeInTheDocument()
    expect(screen.getByText(/QR MyCJSCard · dwell 45 min/)).toBeInTheDocument()
    expect(screen.getByText('Manuel (staff)')).toBeInTheDocument()
    expect(screen.getByText('il y a 12 min')).toBeInTheDocument()
  })

  it('note le scan QR réservé au staff (pas de bouton Scanner ici)', () => {
    render(<CheckinsRecents checkins={CHECKINS} />)
    expect(screen.getByText(/scan du QR badge/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Scanner/i })).toBeNull()
  })

  it('recherche filtre par jeune / source', () => {
    render(<CheckinsRecents checkins={CHECKINS} />)
    fireEvent.change(screen.getByLabelText(/Rechercher un check-in/i), { target: { value: 'modou' } })
    expect(screen.getByText('Modou Fall')).toBeInTheDocument()
    expect(screen.queryByText('Awa Ndiaye')).toBeNull()
  })

  it('état vide', () => {
    render(<CheckinsRecents checkins={[]} />)
    expect(screen.getByText(/Aucun check-in récent/i)).toBeInTheDocument()
  })
})
