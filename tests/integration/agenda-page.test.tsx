/**
 * Tests d'intégration `/agenda` (GUIC-362 refonte v2).
 */

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}))

const mockListEvenements = jest.fn()
jest.mock('@/lib/loaders/evenements', () => ({
  ...jest.requireActual('@/lib/loaders/evenements'),
  listEvenements: (...a: unknown[]) => mockListEvenements(...a),
}))

// GUIC-684 — la page charge les programmes proposés au filtrage : on mocke la
// source (le test cible le rendu de la page, pas le référentiel).
jest.mock('@/lib/programmes/options', () => ({
  loadProgrammeOptions: jest.fn(async () => [{ slug: 'yeah', nom: 'YEAH' }]),
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/agenda',
}))

import { render, screen } from '@testing-library/react'
import Page from '@/app/(public)/agenda/page'
import { getSession } from '@/lib/auth'

const baseEvent = {
  id: 'evt-1',
  titre: 'Atelier CV Tambacounda',
  description: 'Construis un CV qui décroche.',
  type: 'Atelier' as const,
  statut: 'a_venir' as const,
  dateDebut: new Date(Date.now() + 86_400_000 * 7).toISOString(),
  dateFin: null,
  lieu: 'CJS Tambacounda',
  estGratuit: true,
  capaciteMax: 20,
  organisation: 'CJS Tambacounda',
}

beforeEach(() => {
  jest.clearAllMocks()
  mockListEvenements.mockResolvedValue({ items: [baseEvent], total: 1, page: 1, pageSize: 20 })
  // L'AgendaClient charge l'état d'inscription pour chaque event si auth → mock fetch.
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ data: { inscrit: false } }),
  }) as unknown as typeof fetch
})

describe('/agenda — page', () => {
  it('rend le titre, le compteur et la carte', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    render(await Page())
    expect(screen.getByRole('heading', { level: 1, name: /Agenda/i })).toBeInTheDocument()
    expect(screen.getByText(/1 à venir/)).toBeInTheDocument()
    expect(screen.getAllByText(/Atelier CV Tambacounda/i).length).toBeGreaterThan(0)
  })

  it('affiche le lien "Mes événements" si authentifié', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'u1', nom: 'D', prenom: 'A' })
    render(await Page())
    expect(screen.getByRole('link', { name: /Mes événements/i })).toBeInTheDocument()
  })

  it('cache "Mes événements" si non authentifié', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    render(await Page())
    expect(screen.queryByRole('link', { name: /Mes événements/i })).not.toBeInTheDocument()
  })
})
