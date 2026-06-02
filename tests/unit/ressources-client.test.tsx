import { render, screen, fireEvent } from '@testing-library/react'
import { RessourcesClient } from '@/components/ressources/RessourcesClient'
import type { RessourceListItem } from '@/lib/loaders/ressources'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

function makeItem(overrides: Partial<RessourceListItem>): RessourceListItem {
  return {
    id: 'r',
    titre: 'Ressource',
    description: 'desc',
    type: 'PDF',
    theme: 'Thème',
    url: 'https://exemple.org/x',
    vues: 0,
    ...overrides,
  }
}

beforeEach(() => pushMock.mockClear())

describe('<RessourcesClient />', () => {
  it('rend la liste initiale', () => {
    render(
      <RessourcesClient
        initialItems={[
          makeItem({ id: '1', titre: 'Guide A', type: 'Guide' }),
          makeItem({ id: '2', titre: 'Vidéo B', type: 'Video' }),
        ]}
        total={2}
      />,
    )
    expect(screen.getByText('Guide A')).toBeInTheDocument()
    expect(screen.getByText('Vidéo B')).toBeInTheDocument()
  })

  it('filtre par type via chip', () => {
    render(
      <RessourcesClient
        initialItems={[
          makeItem({ id: '1', titre: 'Guide A', type: 'Guide' }),
          makeItem({ id: '2', titre: 'Vidéo B', type: 'Video' }),
        ]}
        total={2}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Vidéos' }))
    expect(screen.queryByText('Guide A')).toBeNull()
    expect(screen.getByText('Vidéo B')).toBeInTheDocument()
  })

  it('filtre via recherche texte', () => {
    render(
      <RessourcesClient
        initialItems={[
          makeItem({ id: '1', titre: 'Guide A', theme: 'Agriculture' }),
          makeItem({ id: '2', titre: 'Vidéo B', theme: 'Entrepreneuriat' }),
        ]}
        total={2}
      />,
    )
    fireEvent.change(screen.getByLabelText('Rechercher une ressource'), {
      target: { value: 'agric' },
    })
    expect(screen.getByText('Guide A')).toBeInTheDocument()
    expect(screen.queryByText('Vidéo B')).toBeNull()
  })

  it('affiche un empty state quand aucun résultat', () => {
    render(<RessourcesClient initialItems={[]} total={0} />)
    expect(screen.getByText('Aucune ressource trouvée')).toBeInTheDocument()
  })

  it('redirige sur /opportunites depuis le empty state', () => {
    render(<RessourcesClient initialItems={[]} total={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voir les opportunités' }))
    expect(pushMock).toHaveBeenCalledWith('/opportunites')
  })
})
