/**
 * Tests d'intégration de la page `/centres` (GUIC-234).
 * - loader Prisma mocké → on vérifie l'usage des vraies données
 * - cas "DB vide" → EmptyState
 * - cas "centres présents" → carte + liste rendues
 */

jest.mock('@/lib/auth', () => ({
  getSession: jest.fn().mockResolvedValue(null),
}))

const mockListCentres = jest.fn()
jest.mock('@/lib/loaders/centres', () => ({
  listCentres: (...a: unknown[]) => mockListCentres(...a),
}))

import { render, screen } from '@testing-library/react'
import Page from '@/app/(public)/centres/page'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('/centres — intégration loader Prisma', () => {
  it('affiche un EmptyState quand aucun centre actif', async () => {
    mockListCentres.mockResolvedValue([])
    render(await Page())
    expect(screen.getByText(/Aucun centre disponible/i)).toBeInTheDocument()
  })

  it('rend la liste quand le loader renvoie des centres', async () => {
    mockListCentres.mockResolvedValue([
      {
        id: 'c-tamba',
        nom: 'CJS Tambacounda',
        region: 'Tambacounda',
        adresse: 'Avenue Senghor',
        ville: 'Tambacounda',
        latitude: 13.77,
        longitude: -13.66,
        distanceKm: 0,
        isPrimary: true,
        ouvert: true,
        horaires: '8h–17h',
        conseillers: 0,
        services: ['Conseil 1-à-1'],
      },
      {
        id: 'c-kolda',
        nom: 'CJS Kolda',
        region: 'Kolda',
        adresse: 'Bouna Kane',
        ville: 'Kolda',
        latitude: 12.89,
        longitude: -14.94,
        distanceKm: 0,
        isPrimary: false,
        ouvert: true,
        horaires: '8h–17h',
        conseillers: 0,
        services: ['Conseil 1-à-1'],
      },
    ])

    render(await Page())
    // Au moins une occurrence du centre primary (mobile + desktop peuvent dupliquer)
    expect(screen.getAllByLabelText(/CJS Tambacounda/i).length).toBeGreaterThan(0)
    expect(screen.getAllByLabelText(/CJS Kolda/i).length).toBeGreaterThan(0)
    expect(mockListCentres).toHaveBeenCalled()
  })
})
