import { render, screen, fireEvent, act } from '@testing-library/react'
import { RessourcesClient } from '@/components/ressources/RessourcesClient'
import type {
  RessourceListItem,
  RessourceFiltres,
} from '@/lib/loaders/ressources'

const pushMock = jest.fn()
let currentSearch = ''
jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
  usePathname: () => '/ressources',
  useSearchParams: () => new URLSearchParams(currentSearch),
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
    niveau: null,
    langue: null,
    categorie: null,
    createdAt: '2026-05-01T00:00:00.000Z',
    ...overrides,
  }
}

function defaultFilters(over: Partial<RessourceFiltres> = {}): RessourceFiltres {
  return { date: 'all', page: 1, ...over }
}

function renderClient(props: {
  items: RessourceListItem[]
  total?: number
  page?: number
  filters?: Partial<RessourceFiltres>
}) {
  return render(
    <RessourcesClient
      initialItems={props.items}
      total={props.total ?? props.items.length}
      page={props.page ?? 1}
      pageSize={20}
      initialFilters={defaultFilters(props.filters)}
    />,
  )
}

beforeEach(() => {
  pushMock.mockClear()
  currentSearch = ''
  jest.useFakeTimers()
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: [] }),
  }) as unknown as typeof fetch
})

afterEach(() => {
  act(() => {
    jest.runOnlyPendingTimers()
  })
  jest.useRealTimers()
})

describe('<RessourcesClient />', () => {
  it('rend la liste initiale', () => {
    renderClient({
      items: [
        makeItem({ id: '1', titre: 'Guide A', type: 'Guide' }),
        makeItem({ id: '2', titre: 'Vidéo B', type: 'Video' }),
      ],
    })
    expect(screen.getByText('Guide A')).toBeInTheDocument()
    expect(screen.getByText('Vidéo B')).toBeInTheDocument()
  })

  it('filtre par type via chip — pousse ?type=Video', () => {
    renderClient({
      items: [makeItem({ id: '1', titre: 'Guide A', type: 'Guide' })],
    })
    fireEvent.click(screen.getByRole('button', { name: 'Vidéos' }))
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/ressources\?.*type=Video/),
      { scroll: false },
    )
  })

  it('recherche texte (debounced 300ms) pousse ?q=…', () => {
    renderClient({ items: [makeItem({ id: '1', titre: 'Guide A' })] })
    fireEvent.change(screen.getByLabelText('Rechercher une ressource'), {
      target: { value: 'agric' },
    })
    expect(pushMock).not.toHaveBeenCalled()
    act(() => {
      jest.advanceTimersByTime(300)
    })
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/ressources\?.*q=agric/),
      { scroll: false },
    )
  })

  it('compteur affiche le total serveur (pas la longueur locale)', () => {
    renderClient({
      items: [makeItem({ id: '1' })],
      total: 42,
    })
    expect(screen.getByTestId('results-count')).toHaveTextContent('42 résultats')
  })

  it('affiche "Charger plus" quand total > items chargés', () => {
    renderClient({
      items: Array.from({ length: 20 }, (_, i) => makeItem({ id: `r${i}` })),
      total: 50,
    })
    expect(
      screen.getByRole('button', { name: 'Charger plus de ressources' }),
    ).toBeInTheDocument()
  })

  it('"Charger plus" pousse ?page=N+1', () => {
    currentSearch = 'type=PDF'
    renderClient({
      items: Array.from({ length: 20 }, (_, i) => makeItem({ id: `r${i}` })),
      total: 50,
      page: 1,
      filters: { type: 'PDF' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Charger plus de ressources' }))
    expect(pushMock).toHaveBeenCalledWith(
      expect.stringMatching(/^\/ressources\?.*page=2/),
      { scroll: false },
    )
  })

  it('affiche un empty state quand aucun résultat', () => {
    renderClient({ items: [], total: 0 })
    expect(screen.getByText('Aucune ressource trouvée')).toBeInTheDocument()
  })

  it('redirige sur /opportunites depuis le empty state', () => {
    renderClient({ items: [], total: 0 })
    fireEvent.click(screen.getByRole('button', { name: 'Voir les opportunités' }))
    expect(pushMock).toHaveBeenCalledWith('/opportunites')
  })

  it('Réinitialiser repousse vers /ressources sans params', () => {
    currentSearch = 'q=foo&type=PDF'
    renderClient({
      items: [makeItem({ id: '1' })],
      total: 1,
      filters: { q: 'foo', type: 'PDF' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Réinitialiser' }))
    expect(pushMock).toHaveBeenCalledWith('/ressources', { scroll: false })
  })
})
