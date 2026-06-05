import { render, screen, fireEvent } from '@testing-library/react'
import {
  RessourcesFiltersSheet,
  type RessourcesFiltresValue,
} from '@/components/ressources/RessourcesFiltersSheet'

/** Tests unitaires GUIC-24 — bottom-sheet filtres avancés ressources. */

function setup(overrides?: Partial<Parameters<typeof RessourcesFiltersSheet>[0]>) {
  const onClose = jest.fn()
  const onApply = jest.fn()
  render(
    <RessourcesFiltersSheet
      isOpen
      onClose={onClose}
      value={{} as RessourcesFiltresValue}
      categoriesOptions={['Business', 'Tech', 'Santé']}
      totalCount={50}
      onApply={onApply}
      {...overrides}
    />,
  )
  return { onClose, onApply }
}

describe('<RessourcesFiltersSheet />', () => {
  it('rend les sections Type, Catégorie, Niveau, Langue et Date', () => {
    setup()
    expect(screen.getByText('Type')).toBeInTheDocument()
    expect(screen.getByText('Catégorie')).toBeInTheDocument()
    expect(screen.getByText('Niveau')).toBeInTheDocument()
    expect(screen.getByText('Langue')).toBeInTheDocument()
    expect(screen.getByText('Date de publication')).toBeInTheDocument()
  })

  it('affiche le total dans le CTA Appliquer', () => {
    setup({ totalCount: 17 })
    expect(screen.getByRole('button', { name: /voir les 17 résultats/i })).toBeInTheDocument()
  })

  it("n'applique qu'au clic sur Voir les résultats", () => {
    const { onApply, onClose } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'PDF' }))
    fireEvent.click(screen.getByRole('button', { name: 'Débutant' }))
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /voir les/i }))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'PDF', niveau: 'Debutant' }),
    )
    expect(onClose).toHaveBeenCalled()
  })

  it('catégorie est multi-select (cumulatif)', () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Business' }))
    fireEvent.click(screen.getByRole('button', { name: 'Tech' }))
    fireEvent.click(screen.getByRole('button', { name: /voir les/i }))
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ categories: ['Business', 'Tech'] }),
    )
  })

  it('Réinitialiser remet le draft à vide sans fermer ni appliquer', () => {
    const { onApply, onClose } = setup({
      value: { type: 'Guide', niveau: 'Avance' },
    })
    expect(screen.getByRole('button', { name: 'Guides' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    expect(screen.getByRole('button', { name: 'Guides' })).toHaveAttribute('aria-pressed', 'false')
    expect(onApply).not.toHaveBeenCalled()
    expect(onClose).not.toHaveBeenCalled()
  })

  it("toggle d'une langue : recliquer désactive", () => {
    const { onApply } = setup()
    fireEvent.click(screen.getByRole('button', { name: 'Wolof' }))
    fireEvent.click(screen.getByRole('button', { name: 'Wolof' }))
    fireEvent.click(screen.getByRole('button', { name: /voir les/i }))
    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ langue: undefined }))
  })

  it('expose "Aucun filtre actif" par défaut', () => {
    setup()
    expect(screen.getByText(/aucun filtre actif/i)).toBeInTheDocument()
  })

  it("masque la section Catégorie quand aucune option n'est fournie", () => {
    setup({ categoriesOptions: [] })
    expect(screen.queryByText('Catégorie')).not.toBeInTheDocument()
  })
})
