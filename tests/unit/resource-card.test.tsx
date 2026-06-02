import { render, screen } from '@testing-library/react'
import { ResourceCard } from '@/components/ressources/ResourceCard'
import type { RessourceListItem } from '@/lib/loaders/ressources'

function makeItem(overrides: Partial<RessourceListItem> = {}): RessourceListItem {
  return {
    id: 'r1',
    titre: 'Guide entrepreneuriat',
    description: 'Tout pour démarrer votre projet',
    type: 'PDF',
    theme: 'Entrepreneuriat',
    url: 'https://example.org/guide.pdf',
    vues: 0,
    ...overrides,
  }
}

describe('<ResourceCard />', () => {
  it('rend titre, description et badge type', () => {
    render(<ResourceCard item={makeItem()} />)
    expect(screen.getByText('Guide entrepreneuriat')).toBeInTheDocument()
    expect(screen.getByText('Tout pour démarrer votre projet')).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
  })

  it('affiche le CTA Télécharger pour un PDF', () => {
    render(<ResourceCard item={makeItem({ type: 'PDF' })} />)
    expect(screen.getByText('Télécharger')).toBeInTheDocument()
  })

  it('affiche le CTA Regarder pour une vidéo', () => {
    render(<ResourceCard item={makeItem({ type: 'Video' })} />)
    expect(screen.getByText('Regarder')).toBeInTheDocument()
  })

  it('lien externe ouvre dans un nouvel onglet (rel noopener)', () => {
    const { container } = render(
      <ResourceCard item={makeItem({ url: 'https://exemple.org/x' })} />,
    )
    const a = container.querySelector('a') as HTMLAnchorElement
    expect(a.target).toBe('_blank')
    expect(a.rel).toContain('noopener')
  })

  it('lien interne sans target=_blank', () => {
    const { container } = render(<ResourceCard item={makeItem({ url: '/docs/x' })} />)
    const a = container.querySelector('a') as HTMLAnchorElement
    expect(a.target).toBe('')
  })

  it('affiche le thème', () => {
    render(<ResourceCard item={makeItem({ theme: 'Agriculture' })} />)
    expect(screen.getByText('Agriculture')).toBeInTheDocument()
  })
})
