import { render, screen, fireEvent } from '@testing-library/react'
import { OpportunitesFiltersSheet } from '@/components/opportunites/OpportunitesFiltersSheet'
import type { FiltresValue } from '@/components/opportunites/FiltresPanel'

const baseValue: FiltresValue = { sortBy: 'recent' }

function setup(overrides?: Partial<Parameters<typeof OpportunitesFiltersSheet>[0]>) {
  const onClose = jest.fn()
  const onApply = jest.fn()
  render(
    <OpportunitesFiltersSheet
      isOpen
      onClose={onClose}
      value={baseValue}
      totalCount={124}
      onApply={onApply}
      {...overrides}
    />,
  )
  return { onClose, onApply }
}

describe('<OpportunitesFiltersSheet />', () => {
  it("rend les sections Type, Domaine, Région et Échéance", () => {
    setup()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Domaine')).toBeInTheDocument()
    expect(screen.getByText('Région')).toBeInTheDocument()
    expect(screen.getByText('Échéance')).toBeInTheDocument()
  })

  it('affiche le total dans le CTA Appliquer', () => {
    setup({ totalCount: 42 })
    expect(screen.getByRole('button', { name: /voir les 42 résultats/i })).toBeInTheDocument()
  })

  it("ne propage l'état au parent qu'au clic sur Appliquer", () => {
    const { onApply, onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Emploi' }))
    fireEvent.click(screen.getByRole('button', { name: 'Dakar' }))
    // Pas d'application tant que pas de clic sur "Appliquer".
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /voir les/i }))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'Emploi', region: 'Dakar', sortBy: 'recent' }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('Réinitialiser remet le draft à vide sans fermer ni appliquer', () => {
    const { onApply, onClose } = setup({ value: { sortBy: 'recent', type: 'Stage' } })
    expect(screen.getByRole('button', { name: 'Stage' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    expect(screen.getByRole('button', { name: 'Stage' })).toHaveAttribute('aria-pressed', 'false')
    expect(onApply).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it('toggle un type : recliquer le désactive', () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Bourse' }))
    fireEvent.click(screen.getByRole('button', { name: 'Bourse' }))
    fireEvent.click(screen.getByRole('button', { name: /voir les/i }))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ type: undefined, sortBy: 'recent' }),
    )
  })

  it("expose 'Aucun filtre actif' quand aucune sélection", () => {
    setup()
    expect(screen.getByText(/aucun filtre actif/i)).toBeInTheDocument()
  })

  it('utilise le libellé accentué de la région (Thiès, Sédhiou)', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Thiès' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sédhiou' })).toBeInTheDocument()
  })
})
