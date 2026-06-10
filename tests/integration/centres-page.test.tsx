/**
 * Tests d'intégration de la page `/centres` (GUIC-234 → refondu GUIC-353 W2).
 *
 * Depuis le Lot 7 W2 la page utilise `getCentresWithStatusAndHoraires` au lieu
 * de `listCentres`. Les cas anciens (DB vide / centres présents) sont
 * conservés ici pour rester anti-régression.
 */

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue(null),
}))

const mockGetCentres = jest.fn()
jest.mock('@/lib/loaders/centres', () => ({
  getCentresWithStatusAndHoraires: (...a: unknown[]) => mockGetCentres(...a),
}))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    profilJeune: { findUnique: jest.fn().mockResolvedValue(null) },
  },
}))

jest.mock('@/components/centres', () => {
  const actual = jest.requireActual('@/components/centres')
  return {
    ...actual,
    CentresMapGoogle: () => <div data-testid="centres-map-google-stub" />,
    MyCJSCard: () => <div data-testid="my-cjs-card-stub" />,
  }
})

import { render, screen } from '@testing-library/react'
import Page from '@/app/(public)/centres/page'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('/centres — intégration loader Prisma', () => {
  it('affiche un EmptyState quand aucun centre actif', async () => {
    mockGetCentres.mockResolvedValue([])
    render(await Page())
    expect(screen.getByText(/Aucun centre disponible/i)).toBeInTheDocument()
  })

  it('rend la liste quand le loader renvoie des centres', async () => {
    mockGetCentres.mockResolvedValue([
      {
        id: 'c-tamba',
        slug: 'cjs-tambacounda',
        nom: 'CJS Tambacounda',
        region: 'Tambacounda',
        ville: 'Tambacounda',
        adresse: 'Avenue Senghor',
        latitude: 13.77,
        longitude: -13.66,
        services: ['Conseil 1-à-1'],
        conseillersCount: 0,
        estActif: true,
        horaires: [],
        isOpen: true,
      },
      {
        id: 'c-kolda',
        slug: 'cjs-kolda',
        nom: 'CJS Kolda',
        region: 'Kolda',
        ville: 'Kolda',
        adresse: 'Bouna Kane',
        latitude: 12.89,
        longitude: -14.94,
        services: ['Conseil 1-à-1'],
        conseillersCount: 0,
        estActif: true,
        horaires: [],
        isOpen: true,
      },
    ])

    render(await Page())
    expect(
      screen.getAllByRole('button', { name: /Voir le centre CJS Tambacounda/i }).length,
    ).toBeGreaterThan(0)
    expect(
      screen.getAllByRole('button', { name: /Voir le centre CJS Kolda/i }).length,
    ).toBeGreaterThan(0)
    expect(mockGetCentres).toHaveBeenCalled()
  })
})
