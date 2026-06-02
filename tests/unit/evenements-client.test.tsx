import { render, screen, fireEvent } from '@testing-library/react'
import { EvenementsClient } from '@/components/evenements/EvenementsClient'
import type { EvenementListItem } from '@/lib/loaders/evenements'

const pushMock = jest.fn()
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

function makeItem(overrides: Partial<EvenementListItem>): EvenementListItem {
  return {
    id: 'ev',
    titre: 'Événement',
    description: 'desc',
    type: 'Atelier',
    statut: 'a_venir',
    dateDebut: '2026-07-15T10:30:00.000Z',
    dateFin: null,
    lieu: 'Dakar',
    estGratuit: true,
    capaciteMax: null,
    organisation: 'CJS',
    ...overrides,
  }
}

beforeEach(() => pushMock.mockClear())

describe('<EvenementsClient />', () => {
  it('rend la liste initiale', () => {
    render(
      <EvenementsClient
        initialItems={[
          makeItem({ id: '1', titre: 'Webinaire IA', type: 'Webinar' }),
          makeItem({ id: '2', titre: 'Forum jeunesse', type: 'Forum' }),
        ]}
        total={2}
      />,
    )
    expect(screen.getByText('Webinaire IA')).toBeInTheDocument()
    expect(screen.getByText('Forum jeunesse')).toBeInTheDocument()
  })

  it('filtre par type via chip', () => {
    render(
      <EvenementsClient
        initialItems={[
          makeItem({ id: '1', titre: 'Webinaire IA', type: 'Webinar' }),
          makeItem({ id: '2', titre: 'Forum jeunesse', type: 'Forum' }),
        ]}
        total={2}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: 'Webinaires' }))
    expect(screen.getByText('Webinaire IA')).toBeInTheDocument()
    expect(screen.queryByText('Forum jeunesse')).toBeNull()
  })

  it('filtre via recherche texte', () => {
    render(
      <EvenementsClient
        initialItems={[
          makeItem({ id: '1', titre: 'Webinaire IA', type: 'Webinar' }),
          makeItem({ id: '2', titre: 'Forum jeunesse', type: 'Forum' }),
        ]}
        total={2}
      />,
    )
    fireEvent.change(screen.getByLabelText('Rechercher un événement'), {
      target: { value: 'forum' },
    })
    expect(screen.queryByText('Webinaire IA')).toBeNull()
    expect(screen.getByText('Forum jeunesse')).toBeInTheDocument()
  })

  it('affiche un empty state quand aucun résultat', () => {
    render(<EvenementsClient initialItems={[]} total={0} />)
    expect(screen.getByText('Aucun événement trouvé')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Voir les opportunités' }),
    ).toBeInTheDocument()
  })

  it('redirige sur /opportunites depuis le empty state', () => {
    render(<EvenementsClient initialItems={[]} total={0} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voir les opportunités' }))
    expect(pushMock).toHaveBeenCalledWith('/opportunites')
  })
})
