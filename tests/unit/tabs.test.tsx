import { render, screen, fireEvent } from '@testing-library/react'
import { Tabs } from '@/components/ui/Tabs'

const ITEMS = [
  { value: 'all', label: 'Toutes', count: 42 },
  { value: 'emploi', label: 'Emplois', count: 12 },
  { value: 'stage', label: 'Stages', count: 0 },
]

describe('<Tabs />', () => {
  it('rend un tablist avec un tab par item et aria-selected sur l\'actif', () => {
    render(<Tabs value="emploi" onChange={() => {}} items={ITEMS} ariaLabel="Filtrer" />)
    const tablist = screen.getByRole('tablist', { name: /filtrer/i })
    expect(tablist).toBeInTheDocument()
    const tabs = screen.getAllByRole('tab')
    expect(tabs).toHaveLength(3)
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'false')
  })

  it('appelle onChange avec la nouvelle valeur au clic', () => {
    const onChange = jest.fn()
    render(<Tabs value="all" onChange={onChange} items={ITEMS} ariaLabel="Filtrer" />)
    fireEvent.click(screen.getByRole('tab', { name: /stages/i }))
    expect(onChange).toHaveBeenCalledWith('stage')
  })

  it('affiche le compteur quand fourni', () => {
    render(<Tabs value="all" onChange={() => {}} items={ITEMS} ariaLabel="Filtrer" />)
    expect(screen.getByRole('tab', { name: /toutes/i })).toHaveTextContent('42')
    expect(screen.getByRole('tab', { name: /stages/i })).toHaveTextContent('0')
  })

  it('gère la navigation clavier ArrowRight / ArrowLeft / Home / End', () => {
    const onChange = jest.fn()
    render(<Tabs value="emploi" onChange={onChange} items={ITEMS} ariaLabel="Filtrer" />)
    const emploi = screen.getByRole('tab', { name: /emplois/i })
    emploi.focus()
    fireEvent.keyDown(emploi, { key: 'ArrowRight' })
    expect(onChange).toHaveBeenLastCalledWith('stage')
    fireEvent.keyDown(emploi, { key: 'ArrowLeft' })
    expect(onChange).toHaveBeenLastCalledWith('all')
    fireEvent.keyDown(emploi, { key: 'End' })
    expect(onChange).toHaveBeenLastCalledWith('stage')
    fireEvent.keyDown(emploi, { key: 'Home' })
    expect(onChange).toHaveBeenLastCalledWith('all')
  })

  it('respecte tap-min 44px et fond teal-deep plein sur l\'actif (pilule, design v5 Lot 14)', () => {
    render(<Tabs value="all" onChange={() => {}} items={ITEMS} ariaLabel="Filtrer" />)
    const active = screen.getByRole('tab', { name: /toutes/i })
    const inactive = screen.getByRole('tab', { name: /emplois/i })
    expect(active.className).toMatch(/min-h-\[var\(--tap-min\)\]/)
    expect(active.className).toMatch(/bg-gj-teal-deep/)
    expect(active.className).toMatch(/text-white/)
    expect(inactive.className).not.toMatch(/bg-gj-teal-deep/)
  })

  it('rend le tablist dans un conteneur pilule (fond blanc, bordure) — Segmented Lot 14', () => {
    render(<Tabs value="all" onChange={() => {}} items={ITEMS} ariaLabel="Filtrer" />)
    const tablist = screen.getByRole('tablist', { name: /filtrer/i })
    expect(tablist.className).toMatch(/bg-gj-surface/)
    expect(tablist.className).toMatch(/border-gj-line\b/)
  })
})
