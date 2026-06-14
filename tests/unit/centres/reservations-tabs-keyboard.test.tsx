/** @jest-environment jsdom */
import { render, screen, fireEvent } from '@testing-library/react'
import { ReservationsTabs, type ReservationTab } from '@/components/centres/ReservationsTabs'

const TABS: ReservationTab[] = [
  { key: 'a-venir', label: 'À venir', count: 2 },
  { key: 'passees', label: 'Passées', count: 5 },
  { key: 'toutes', label: 'Toutes', count: 7 },
]

/**
 * GUIC-391 — APG WAI tablist keyboard navigation.
 * Pattern : https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
 */
describe('<ReservationsTabs /> keyboard navigation (APG WAI)', () => {
  it('ArrowRight cycle vers le tab suivant', () => {
    const spy = jest.fn()
    render(<ReservationsTabs value="a-venir" tabs={TABS} onChange={spy} />)
    const active = screen.getByRole('tab', { name: /À venir/ })
    active.focus()
    fireEvent.keyDown(active, { key: 'ArrowRight' })
    expect(spy).toHaveBeenLastCalledWith('passees')
  })

  it('ArrowRight loop : depuis le dernier tab retourne au premier', () => {
    const spy = jest.fn()
    render(<ReservationsTabs value="toutes" tabs={TABS} onChange={spy} />)
    const last = screen.getByRole('tab', { name: /Toutes/ })
    last.focus()
    fireEvent.keyDown(last, { key: 'ArrowRight' })
    expect(spy).toHaveBeenLastCalledWith('a-venir')
  })

  it('ArrowLeft cycle vers le tab précédent et loop sur le dernier', () => {
    const spy = jest.fn()
    render(<ReservationsTabs value="a-venir" tabs={TABS} onChange={spy} />)
    const active = screen.getByRole('tab', { name: /À venir/ })
    active.focus()
    fireEvent.keyDown(active, { key: 'ArrowLeft' })
    // loop : premier → dernier
    expect(spy).toHaveBeenLastCalledWith('toutes')
  })

  it('Home focus le premier tab', () => {
    const spy = jest.fn()
    render(<ReservationsTabs value="toutes" tabs={TABS} onChange={spy} />)
    const active = screen.getByRole('tab', { name: /Toutes/ })
    active.focus()
    fireEvent.keyDown(active, { key: 'Home' })
    expect(spy).toHaveBeenLastCalledWith('a-venir')
  })

  it('End focus le dernier tab', () => {
    const spy = jest.fn()
    render(<ReservationsTabs value="a-venir" tabs={TABS} onChange={spy} />)
    const active = screen.getByRole('tab', { name: /À venir/ })
    active.focus()
    fireEvent.keyDown(active, { key: 'End' })
    expect(spy).toHaveBeenLastCalledWith('toutes')
  })

  it('roving tabindex : seul le tab actif a tabIndex=0', () => {
    render(<ReservationsTabs value="passees" tabs={TABS} onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: /À venir/ })).toHaveAttribute('tabindex', '-1')
    expect(screen.getByRole('tab', { name: /Passées/ })).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('tab', { name: /Toutes/ })).toHaveAttribute('tabindex', '-1')
  })
})
