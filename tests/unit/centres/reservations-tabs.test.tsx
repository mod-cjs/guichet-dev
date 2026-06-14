/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { ReservationsTabs, type ReservationTab } from '@/components/centres/ReservationsTabs'

const TABS: ReservationTab[] = [
  { key: 'a-venir', label: 'À venir', count: 2 },
  { key: 'passees', label: 'Passées', count: 5 },
  { key: 'toutes', label: 'Toutes', count: 7 },
]

describe('<ReservationsTabs />', () => {
  it('rend un role=tablist avec ARIA', () => {
    render(<ReservationsTabs value="a-venir" tabs={TABS} onChange={() => {}} />)
    expect(screen.getByRole('tablist', { name: /Filtres réservations/ })).toBeInTheDocument()
  })

  it('affiche les compteurs (N) intégrés au label', () => {
    render(<ReservationsTabs value="a-venir" tabs={TABS} onChange={() => {}} />)
    expect(screen.getByText('(2)')).toBeInTheDocument()
    expect(screen.getByText('(5)')).toBeInTheDocument()
  })

  it('marque le tab actif aria-selected=true', () => {
    render(<ReservationsTabs value="passees" tabs={TABS} onChange={() => {}} />)
    const active = screen.getByRole('tab', { name: /Passées/ })
    expect(active).toHaveAttribute('aria-selected', 'true')
  })

  it('appelle onChange quand on clique sur un autre tab', () => {
    const spy = jest.fn()
    render(<ReservationsTabs value="a-venir" tabs={TABS} onChange={spy} />)
    fireEvent.click(screen.getByRole('tab', { name: /Toutes/ }))
    expect(spy).toHaveBeenCalledWith('toutes')
  })
})
