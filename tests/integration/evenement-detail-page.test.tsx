/**
 * Tests d'intégration `/agenda/[id]` (GUIC-362 refonte v2).
 */

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn(),
}))

const mockGetEvenementById = jest.fn()
jest.mock('@/lib/loaders/evenements', () => ({
  ...jest.requireActual('@/lib/loaders/evenements'),
  getEvenementById: (...a: unknown[]) => mockGetEvenementById(...a),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    inscriptionEvenement: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
  },
}))

const mockNotFound = jest.fn(() => {
  throw new Error('NEXT_NOT_FOUND')
})
jest.mock('next/navigation', () => ({
  notFound: () => mockNotFound(),
  useRouter: () => ({ push: jest.fn(), prefetch: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/agenda/evt-1',
}))

import { render, screen } from '@testing-library/react'
import Page from '@/app/(public)/agenda/[id]/page'
import { getSession } from '@/lib/auth'

const baseDetail = {
  id: 'evt-1',
  titre: 'Bootcamp Data Analyse',
  description: 'Du tableur au tableau de bord.',
  type: 'Formation' as const,
  statut: 'a_venir' as const,
  dateDebut: new Date(Date.now() + 86_400_000 * 14).toISOString(),
  dateFin: null,
  lieu: 'CJS Dakar Plateau',
  estGratuit: true,
  capaciteMax: 24,
  organisation: 'CJS Dakar',
  centre: { nom: 'CJS Dakar', ville: 'Dakar', latitude: 14.7, longitude: -17.4 },
  placesRestantes: 21,
  inscriptionsCount: 3,
}

beforeEach(() => {
  jest.clearAllMocks()
})

describe('/agenda/[id] — page détail', () => {
  it('rend le hero + sections + CTA quand l’événement existe', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetEvenementById.mockResolvedValue(baseDetail)
    render(await Page({ params: Promise.resolve({ id: 'evt-1' }) }))
    expect(screen.getByRole('heading', { level: 1, name: /Bootcamp Data Analyse/i })).toBeInTheDocument()
    expect(screen.getAllByText(/CJS Dakar Plateau/i).length).toBeGreaterThan(0)
    expect(screen.getByText(/À propos/i)).toBeInTheDocument()
    expect(screen.getByText(/Informations pratiques/i)).toBeInTheDocument()
    expect(screen.getByText(/3 \/ 24 inscrits/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Se connecter/i })).toBeInTheDocument()
  })

  it('appelle notFound() si introuvable', async () => {
    ;(getSession as jest.Mock).mockResolvedValue(null)
    mockGetEvenementById.mockResolvedValue(null)
    await expect(
      Page({ params: Promise.resolve({ id: 'inconnu' }) }),
    ).rejects.toThrow('NEXT_NOT_FOUND')
    expect(mockNotFound).toHaveBeenCalled()
  })

  it('CTA "S\'inscrire" si user connecté et pas inscrit', async () => {
    ;(getSession as jest.Mock).mockResolvedValue({ cjsUid: 'u1', nom: 'B', prenom: 'A' })
    mockGetEvenementById.mockResolvedValue(baseDetail)
    render(await Page({ params: Promise.resolve({ id: 'evt-1' }) }))
    expect(screen.getByRole('button', { name: /S'inscrire/i })).toBeInTheDocument()
  })
})
