/**
 * @jest-environment jsdom
 *
 * Tests <MesFavoris /> (GUIC-191) — états vide, loading, liste, filtres par type.
 */
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react'
import { MesFavoris } from '@/components/jeune/MesFavoris'
import type { OpportuniteListItem } from '@/types/opportunite'

const ITEMS: OpportuniteListItem[] = [
  {
    id: 'a',
    slug: 'a',
    titre: 'Stage backend',
    type: 'Stage',
    domaine: 'Numerique',
    region: 'Dakar',
    organisation: 'Org A',
    remuneration: null,
    deadline: null,
  },
  {
    id: 'b',
    slug: 'b',
    titre: 'Bourse master',
    type: 'Bourse',
    domaine: 'Education',
    region: 'Thies',
    organisation: 'Org B',
    remuneration: null,
    deadline: null,
  },
]

function mockFetch(response: { ok: boolean; json?: () => Promise<unknown>; status?: number }) {
  global.fetch = jest.fn().mockResolvedValue({
    ok: response.ok,
    status: response.status ?? (response.ok ? 200 : 500),
    json: response.json ?? (() => Promise.resolve({ data: [] })),
  }) as unknown as typeof fetch
}

describe('<MesFavoris />', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('affiche un état vide avec CTA quand la liste est vide', async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ data: [] }) })
    render(<MesFavoris />)
    await waitFor(() => {
      expect(screen.getByText(/Aucun favori/i)).toBeInTheDocument()
    })
    expect(screen.getByText(/Voir les opportunités/i)).toBeInTheDocument()
  })

  it("rend une liste d'OppCard et la rangée de chips quand des favoris existent", async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ data: ITEMS }) })
    render(<MesFavoris />)
    await waitFor(() => {
      expect(screen.getAllByTestId('opp-card')).toHaveLength(2)
    })
    expect(screen.getByTestId('favoris-type-chips')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Tous' })).toBeInTheDocument()
  })

  it('filtre la liste par type quand on sélectionne un chip', async () => {
    mockFetch({ ok: true, json: () => Promise.resolve({ data: ITEMS }) })
    render(<MesFavoris />)
    await waitFor(() => {
      expect(screen.getAllByTestId('opp-card')).toHaveLength(2)
    })
    act(() => {
      fireEvent.click(screen.getByRole('tab', { name: 'Stage' }))
    })
    expect(screen.getAllByTestId('opp-card')).toHaveLength(1)
    expect(screen.getByText('Stage backend')).toBeInTheDocument()
    expect(screen.queryByText('Bourse master')).toBeNull()
  })

  it("affiche un message d'erreur quand l'API échoue", async () => {
    mockFetch({ ok: false })
    render(<MesFavoris />)
    await waitFor(() => {
      expect(screen.getByText(/Impossible de charger vos favoris/i)).toBeInTheDocument()
    })
  })
})
