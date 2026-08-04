/**
 * GUIC-689 (Lot F2) — bascule franche entre l'écran d'accueil médiathèque et
 * la vue LISTE existante sur `/ressources`, pilotée par les `searchParams`.
 *
 * Couvre :
 *  1. Aucun searchParam actif → écran d'accueil (`getRessourcesHome`, PAS
 *     `listRessources`).
 *  2. `?q=` actif → vue liste (`listRessources`, PAS `getRessourcesHome`).
 *  3. `?theme=` actif (clic sur une catégorie de l'accueil) → vue liste,
 *     avec le filtre `theme` transmis au loader.
 *  4. `?page=2` (lien direct/rechargé) → vue liste, jamais l'accueil.
 */
const mockListRessources = jest.fn()
const mockGetRessourcesHome = jest.fn()
jest.mock('@/lib/loaders/ressources', () => ({
  listRessources: (...a: unknown[]) => mockListRessources(...a),
  getRessourcesHome: (...a: unknown[]) => mockGetRessourcesHome(...a),
}))

const mockLoadProgrammeOptions = jest.fn()
jest.mock('@/lib/programmes/options', () => ({
  loadProgrammeOptions: (...a: unknown[]) => mockLoadProgrammeOptions(...a),
}))

// La page a gagné une dépendance session (GUIC-688 : `userIsConnected` pilote
// l'affichage côté liste). Sans ce mock, `@/lib/auth` tire des dépendances ESM
// que Jest ne transforme pas — la suite ne démarre même pas.
jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue(null),
}))

jest.mock('@/components/ressources', () => ({
  MediathequeHome: () => <div data-testid="mediatheque-home-stub" />,
  RessourcesClient: () => <div data-testid="ressources-client-stub" />,
}))

import { render, screen } from '@testing-library/react'
import RessourcesPage from '@/app/(public)/ressources/page'

beforeEach(() => {
  jest.clearAllMocks()
  mockGetRessourcesHome.mockResolvedValue({ categories: [], recentes: [], populaires: [] })
  mockListRessources.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 })
  mockLoadProgrammeOptions.mockResolvedValue([])
})

describe('GUIC-689 — bascule accueil médiathèque / liste sur /ressources', () => {
  it("sans searchParams, rend l'accueil médiathèque et n'appelle pas listRessources", async () => {
    const ui = await RessourcesPage({ searchParams: Promise.resolve({}) })
    render(ui)

    expect(screen.getByTestId('mediatheque-home-stub')).toBeInTheDocument()
    expect(screen.queryByTestId('ressources-client-stub')).not.toBeInTheDocument()
    expect(mockGetRessourcesHome).toHaveBeenCalledTimes(1)
    expect(mockListRessources).not.toHaveBeenCalled()
  })

  it("avec ?q= actif, rend la vue LISTE et n'appelle pas getRessourcesHome", async () => {
    const ui = await RessourcesPage({ searchParams: Promise.resolve({ q: 'agriculture' }) })
    render(ui)

    expect(screen.getByTestId('ressources-client-stub')).toBeInTheDocument()
    expect(screen.queryByTestId('mediatheque-home-stub')).not.toBeInTheDocument()
    expect(mockListRessources).toHaveBeenCalledTimes(1)
    expect(mockGetRessourcesHome).not.toHaveBeenCalled()
  })

  it('avec ?theme= actif (clic catégorie), rend la vue LISTE et transmet le filtre theme', async () => {
    const ui = await RessourcesPage({ searchParams: Promise.resolve({ theme: 'Emploi' }) })
    render(ui)

    expect(screen.getByTestId('ressources-client-stub')).toBeInTheDocument()
    expect(mockListRessources).toHaveBeenCalledWith(
      expect.objectContaining({ theme: 'Emploi' }),
    )
  })

  it('avec ?page=2 (lien direct), rend la vue LISTE — jamais l\'accueil', async () => {
    const ui = await RessourcesPage({ searchParams: Promise.resolve({ page: '2' }) })
    render(ui)

    expect(screen.getByTestId('ressources-client-stub')).toBeInTheDocument()
    expect(screen.queryByTestId('mediatheque-home-stub')).not.toBeInTheDocument()
    expect(mockListRessources).toHaveBeenCalledWith(expect.objectContaining({ page: 2 }))
  })
})
