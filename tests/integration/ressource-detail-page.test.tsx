/**
 * GUIC-363 — Tests d'intégration `/ressources/[id]`.
 *
 * Couvre :
 *  1. Rend le hero (titre + badge type) quand la ressource existe
 *  2. Appelle notFound() quand la ressource est introuvable
 *  3. Affiche la liste « Ressources liées » quand des items existent
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetRessourceById = jest.fn<any, [string]>()
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetRessourcesRelated = jest.fn<any, [string, number | undefined]>()
const mockIncrementVues = jest.fn<Promise<void>, [string]>(async () => {})

jest.mock('@/lib/loaders/ressources', () => ({
  getRessourceById: (id: string) => mockGetRessourceById(id),
  getRessourcesRelated: (id: string, take?: number) => mockGetRessourcesRelated(id, take),
  incrementRessourceVues: (id: string) => mockIncrementVues(id),
}))

const mockNotFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
}))

// GUIC-689 — la page lit la session (userIsConnected) via @/lib/auth, qui
// tire `jose` (ESM, non transformé par jest). Hors sujet ici : on neutralise.
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(async () => null),
}))

// Le client utilise fetch au montage pour les IDs favoris — on neutralise.
jest.mock(
  '@/app/(public)/ressources/[id]/ressource-detail-client',
  () => ({
    RessourceDetailClient: ({ detail }: { detail: { titre: string } }) => (
      <div data-testid="client-stub">{detail.titre}</div>
    ),
  }),
)

import { render, screen } from '@testing-library/react'
import Page from '@/app/(public)/ressources/[id]/page'

const baseRessource = {
  id: 'r-123',
  titre: 'Guide entrepreneuriat',
  description: 'Description longue de la ressource utile à la démo.',
  type: 'PDF' as const,
  theme: 'Entrepreneuriat',
  url: 'https://example.com/guide.pdf',
  vues: 42,
  niveau: 'Debutant' as const,
  langue: 'FR' as const,
  categorie: 'Formation',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-02T00:00:00.000Z',
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('GUIC-363 — /ressources/[id] page détail', () => {
  it('rend le hero (titre + badge type) quand la ressource existe', async () => {
    mockGetRessourceById.mockResolvedValue(baseRessource)
    mockGetRessourcesRelated.mockResolvedValue([])

    const ui = await Page({ params: Promise.resolve({ id: 'r-123' }) })
    render(ui)

    expect(screen.getByTestId('ressource-detail-hero')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1, name: /Guide entrepreneuriat/i })).toBeInTheDocument()
    expect(screen.getByText('PDF')).toBeInTheDocument()
    expect(mockIncrementVues).toHaveBeenCalledWith('r-123')
  })

  it('appelle notFound() quand la ressource est introuvable', async () => {
    mockGetRessourceById.mockResolvedValue(null)

    await expect(
      Page({ params: Promise.resolve({ id: 'inexistant' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
    expect(mockGetRessourcesRelated).not.toHaveBeenCalled()
  })

  it('affiche la liste « Ressources liées » quand des items existent', async () => {
    mockGetRessourceById.mockResolvedValue(baseRessource)
    mockGetRessourcesRelated.mockResolvedValue([
      { ...baseRessource, id: 'r-456', titre: 'Autre ressource' },
      { ...baseRessource, id: 'r-789', titre: 'Encore une' },
    ])

    const ui = await Page({ params: Promise.resolve({ id: 'r-123' }) })
    render(ui)

    expect(screen.getByTestId('ressource-related')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: /Ressources liées/i })).toBeInTheDocument()
    expect(screen.getByText('Autre ressource')).toBeInTheDocument()
    expect(screen.getByText('Encore une')).toBeInTheDocument()
  })
})
