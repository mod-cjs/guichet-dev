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

  // GUIC-689 — avant fix : `deadline` vivait dans un `useState` local totalement
  // déconnecté de `draft` ; `apply()` faisait `onApply(draft)` sans jamais fusionner
  // `deadline` dedans. Le clic sur une tranche n'écrivait même pas dans l'URL.
  describe('Échéance — 3 tranches alignées sur le desktop (GUIC-689)', () => {
    it('rend les 3 tranches de la maquette v5 : "< 7 jours", "< 30 jours", "Sans limite"', () => {
      setup()
      expect(screen.getByRole('button', { name: '< 7 jours' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '< 30 jours' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Sans limite' })).toBeInTheDocument()
    })

    it('"Sans limite" est sélectionné par défaut (aucun filtre deadline actif)', () => {
      setup()
      expect(screen.getByRole('button', { name: 'Sans limite' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })

    it('sélectionner "< 7 jours" le propage réellement à onApply (fixe le bug de fond)', () => {
      const { onApply } = setup()
      fireEvent.click(screen.getByRole('button', { name: '< 7 jours' }))
      fireEvent.click(screen.getByRole('button', { name: /voir les/i }))
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ deadline: '7' }))
    })

    it('sélectionner "< 30 jours" puis "Sans limite" repasse deadline à undefined', () => {
      const { onApply } = setup()
      fireEvent.click(screen.getByRole('button', { name: '< 30 jours' }))
      fireEvent.click(screen.getByRole('button', { name: 'Sans limite' }))
      fireEvent.click(screen.getByRole('button', { name: /voir les/i }))
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ deadline: undefined }))
    })

    it('recliquer sur "< 30 jours" le désélectionne (toggle)', () => {
      const { onApply } = setup()
      fireEvent.click(screen.getByRole('button', { name: '< 30 jours' }))
      fireEvent.click(screen.getByRole('button', { name: '< 30 jours' }))
      fireEvent.click(screen.getByRole('button', { name: /voir les/i }))
      expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ deadline: undefined }))
    })

    it('deadline compte dans le badge "N filtres actifs"', () => {
      setup()
      fireEvent.click(screen.getByRole('button', { name: '< 7 jours' }))
      expect(screen.getByText(/1 filtre actif/i)).toBeInTheDocument()
    })

    it('une valeur deadline initiale (venant de l\'URL) est reflétée dans le draft', () => {
      setup({ value: { sortBy: 'recent', deadline: '30' } })
      expect(screen.getByRole('button', { name: '< 30 jours' })).toHaveAttribute(
        'aria-pressed',
        'true',
      )
    })
  })
})
