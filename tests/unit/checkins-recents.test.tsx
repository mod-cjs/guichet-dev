/** @jest-environment jsdom */
/** GUIC-687 — « Check-ins récents » (Fréquentation) : liste présentationnelle + pager serveur. */
import { render, screen } from '@testing-library/react'
import { CheckinsRecents, type CheckinRow } from '@/app/admin/centres/[id]/CheckinsRecents'
import { paginate } from '@/lib/centre-pagination'

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => new URLSearchParams(''),
}))

const CHECKINS: CheckinRow[] = [
  { id: 'c1', jeune: 'Awa Ndiaye', via: 'QR MyCJSCard', dwell: 'dwell 45 min', quand: 'il y a 12 min' },
  { id: 'c2', jeune: 'Modou Fall', via: 'Manuel (staff)', dwell: null, quand: 'il y a 40 min' },
]

describe('CheckinsRecents', () => {
  it('liste les check-ins avec source, dwell et temps relatif', () => {
    render(<CheckinsRecents checkins={CHECKINS} info={paginate(2, 1)} />)
    expect(screen.getByText('Awa Ndiaye')).toBeInTheDocument()
    expect(screen.getByText(/QR MyCJSCard · dwell 45 min/)).toBeInTheDocument()
    expect(screen.getByText('Manuel (staff)')).toBeInTheDocument()
    expect(screen.getByText('il y a 12 min')).toBeInTheDocument()
  })

  it('affiche le pager (X sur N) + note QR staff', () => {
    render(<CheckinsRecents checkins={CHECKINS} info={paginate(2, 1)} />)
    expect(screen.getByText(/sur/)).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument() // total
    expect(screen.getByText(/scan du QR badge/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Scanner/i })).toBeNull()
  })

  it('état vide (total 0)', () => {
    render(<CheckinsRecents checkins={[]} info={paginate(0, 1)} />)
    expect(screen.getByText(/Aucun check-in récent/i)).toBeInTheDocument()
  })
})
