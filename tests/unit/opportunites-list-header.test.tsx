import { render, screen, fireEvent } from '@testing-library/react'
import { OpportunitesListHeader, type ActiveChip } from '@/components/opportunites/OpportunitesListHeader'

function setup(overrides?: Partial<Parameters<typeof OpportunitesListHeader>[0]>) {
  const onSearchChange = jest.fn()
  const onSortChange = jest.fn()
  render(
    <OpportunitesListHeader
      searchValue=""
      onSearchChange={onSearchChange}
      sortBy="recent"
      onSortChange={onSortChange}
      total={124}
      {...overrides}
    />,
  )
  return { onSearchChange, onSortChange }
}

describe('<OpportunitesListHeader />', () => {
  it('rend le titre dynamique avec compte au pluriel', () => {
    setup({ total: 124 })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('124 opportunités')
  })

  it('singularise quand total === 1', () => {
    setup({ total: 1 })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('1 opportunité')
  })

  it('inclut la query active dans le titre', () => {
    setup({ activeQuery: 'data science', total: 12 })
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('data science')
  })

  it('affiche le raccourci ⌘ K quand le champ est vide', () => {
    setup({ searchValue: '' })
    expect(screen.getByText(/⌘ K/)).toBeInTheDocument()
  })

  it('Cmd+K focus le champ recherche', () => {
    setup({ searchValue: '' })
    const input = screen.getByRole('searchbox', { name: /rechercher/i })
    expect(document.activeElement).not.toBe(input)
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(document.activeElement).toBe(input)
  })

  it('le bouton clear (×) appelle onSearchChange("") quand query non vide', () => {
    const { onSearchChange } = setup({ searchValue: 'dev' })
    const clear = screen.getByRole('button', { name: /effacer la recherche/i })
    fireEvent.click(clear)
    expect(onSearchChange).toHaveBeenCalledWith('')
  })

  it('le sélecteur tri ouvre un menu et propage onSortChange', () => {
    const { onSortChange } = setup({ sortBy: 'recent' })
    const trigger = screen.getByRole('button', { name: /trier par/i })
    fireEvent.click(trigger)
    const opt = screen.getByRole('option', { name: /échéance proche/i })
    fireEvent.click(opt)
    expect(onSortChange).toHaveBeenCalledWith('deadline')
  })

  it('rend les chips actives removables et propage onRemove', () => {
    const onRemove = jest.fn()
    const chips: ActiveChip[] = [
      { key: 'type-Emploi', label: 'Emploi', onRemove },
      { key: 'reg-Dakar', label: 'Dakar', onRemove: jest.fn() },
    ]
    setup({ activeChips: chips })
    expect(screen.getByRole('button', { name: /retirer le filtre emploi/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /retirer le filtre dakar/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /retirer le filtre emploi/i }))
    expect(onRemove).toHaveBeenCalled()
  })

  it('affiche "Aucun filtre actif" quand aucune chip', () => {
    setup()
    expect(screen.getByText(/aucun filtre actif/i)).toBeInTheDocument()
  })
})
