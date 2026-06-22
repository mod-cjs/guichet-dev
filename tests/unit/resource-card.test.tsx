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
    niveau: null,
    langue: null,
    categorie: null,
    createdAt: '2026-05-01T00:00:00.000Z',
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

  // GUIC-363 — l'overlay de la carte pointe désormais vers la page détail
  // interne (`/ressources/<id>`), quelle que soit l'URL cible de la ressource.
  // L'ouverture externe (nouvel onglet) est gérée depuis la page détail, plus
  // depuis la carte → plus de target=_blank ici.
  it('le lien de la carte pointe vers la page détail interne /ressources/<id>', () => {
    const { container } = render(
      <ResourceCard item={makeItem({ id: 'r42', url: 'https://exemple.org/x' })} />,
    )
    const a = container.querySelector('a') as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('/ressources/r42')
    expect(a.target).toBe('')
  })

  it('même pour une URL interne, la carte renvoie vers /ressources/<id>', () => {
    const { container } = render(
      <ResourceCard item={makeItem({ id: 'r7', url: '/docs/x' })} />,
    )
    const a = container.querySelector('a') as HTMLAnchorElement
    expect(a.getAttribute('href')).toBe('/ressources/r7')
    expect(a.target).toBe('')
  })

  it('affiche le thème', () => {
    render(<ResourceCard item={makeItem({ theme: 'Agriculture' })} />)
    expect(screen.getByText('Agriculture')).toBeInTheDocument()
  })
})
