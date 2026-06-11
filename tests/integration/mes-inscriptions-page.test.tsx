/**
 * Tests d'intégration `/jeune/mes-inscriptions` (GUIC-362).
 */

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}))

const mockGetMes = jest.fn()
jest.mock('@/lib/loaders/evenements', () => ({
  ...jest.requireActual('@/lib/loaders/evenements'),
  getMesInscriptions: (...a: unknown[]) => mockGetMes(...a),
}))

const mockRedirect = jest.fn((_url: string) => {
  throw new Error('NEXT_REDIRECT')
})
jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/jeune/mes-inscriptions',
}))

import { render, screen } from '@testing-library/react'
import Page from '@/app/jeune/(app)/mes-inscriptions/page'
import { getSession } from '@/lib/auth'

const baseEvent = {
  id: 'evt-1',
  titre: 'Forum régional emploi',
  description: 'Plus de 40 recruteurs.',
  type: 'Forum' as const,
  statut: 'a_venir' as const,
  dateDebut: new Date(Date.now() + 86_400_000 * 3).toISOString(),
  dateFin: null,
  lieu: 'Diamniadio',
  estGratuit: true,
  capaciteMax: 500,
  organisation: 'ANPEJ',
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('/jeune/mes-inscriptions — page', () => {
  it('redirige vers /auth/connexion si non authentifié', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    await expect(Page()).rejects.toThrow('NEXT_REDIRECT')
    expect(mockRedirect).toHaveBeenCalledWith(expect.stringContaining('/auth/connexion'))
  })

  it('rend les inscriptions à venir du user', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'u1', nom: 'B', prenom: 'A' })
    mockGetMes.mockResolvedValue({
      aVenir: [
        {
          inscriptionId: 'i1',
          statut: 'inscrit',
          inscritA: new Date().toISOString(),
          evenement: baseEvent,
        },
      ],
      passes: [],
    })
    render(await Page())
    expect(screen.getByRole('heading', { level: 1, name: /Mes événements/i })).toBeInTheDocument()
    expect(screen.getByText(/Forum régional emploi/i)).toBeInTheDocument()
    expect(screen.getByText(/À venir \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/Passés \(0\)/i)).toBeInTheDocument()
  })

  it('EmptyState si aucune inscription à venir', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'u1', nom: 'B', prenom: 'A' })
    mockGetMes.mockResolvedValue({ aVenir: [], passes: [] })
    render(await Page())
    expect(screen.getByText(/Aucune inscription à venir/i)).toBeInTheDocument()
  })
})
