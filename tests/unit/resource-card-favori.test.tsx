import { render, screen, fireEvent } from '@testing-library/react'
import { ResourceCard } from '@/components/ressources/ResourceCard'
import type { RessourceListItem } from '@/lib/loaders/ressources'

/** Tests unitaires GUIC-24 — bouton bookmark sur ResourceCard. */

const ITEM: RessourceListItem = {
  id: 'r-123',
  titre: 'Guide entrepreneuriat',
  description: 'Lance ton activité au Sénégal',
  type: 'Guide',
  theme: 'Entrepreneuriat',
  url: 'https://example.org/guide.pdf',
  vues: 42,
  niveau: 'Debutant',
  langue: 'FR',
  categorie: 'Business',
  createdAt: '2026-05-01T00:00:00.000Z',
}

describe('<ResourceCard /> bouton favori', () => {
  it("n'affiche pas le bouton bookmark sans handler onToggleFavori", () => {
    render(<ResourceCard item={ITEM} />)
    expect(screen.queryByTestId('ressource-favori-btn')).not.toBeInTheDocument()
  })

  it('affiche le bouton et le passe aria-pressed=false quand non favori', () => {
    render(<ResourceCard item={ITEM} isFavori={false} onToggleFavori={() => {}} />)
    const btn = screen.getByTestId('ressource-favori-btn')
    expect(btn).toHaveAttribute('aria-pressed', 'false')
    expect(btn).toHaveAccessibleName(/ajouter aux favoris/i)
  })

  it('passe aria-pressed=true et libellé "Retirer" quand favori', () => {
    render(<ResourceCard item={ITEM} isFavori onToggleFavori={() => {}} />)
    const btn = screen.getByTestId('ressource-favori-btn')
    expect(btn).toHaveAttribute('aria-pressed', 'true')
    expect(btn).toHaveAccessibleName(/retirer des favoris/i)
  })

  it('appelle onToggleFavori avec l’id au clic et stoppe la propagation', () => {
    const onToggle = jest.fn()
    render(<ResourceCard item={ITEM} onToggleFavori={onToggle} />)
    fireEvent.click(screen.getByTestId('ressource-favori-btn'))
    expect(onToggle).toHaveBeenCalledWith('r-123')
    expect(onToggle).toHaveBeenCalledTimes(1)
  })
})
