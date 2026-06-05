/**
 * @jest-environment node
 *
 * Tests du loader `listCentres` (GUIC-234).
 * Prisma est mocké — on vérifie le mapping DTO + le tri + le filtre `estActif`.
 */

const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { centre: { findMany: (...a: unknown[]) => mockFindMany(...a) } },
}))

import { listCentres } from '@/lib/loaders/centres'

beforeEach(() => {
  jest.clearAllMocks()
})

describe('listCentres', () => {
  it('renvoie un tableau vide quand aucun centre actif en DB', async () => {
    mockFindMany.mockResolvedValue([])
    const out = await listCentres()
    expect(out).toEqual([])
    // Filtre estActif: true appliqué
    expect(mockFindMany).toHaveBeenCalledTimes(1)
    const arg = mockFindMany.mock.calls[0][0]
    expect(arg.where).toEqual({ estActif: true })
    expect(arg.orderBy).toEqual([{ region: 'asc' }, { nom: 'asc' }])
  })

  it('map un centre unique en DTO complet et le marque comme primary', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'c-tamba',
        nom: 'CJS Tambacounda',
        region: 'Tambacounda',
        adresse: 'Avenue Senghor',
        latitude: 13.77,
        longitude: -13.66,
      },
    ])

    const out = await listCentres()
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({
      id: 'c-tamba',
      nom: 'CJS Tambacounda',
      region: 'Tambacounda',
      adresse: 'Avenue Senghor',
      latitude: 13.77,
      longitude: -13.66,
      isPrimary: true,
      ouvert: true,
    })
    // Défauts UI présents (TODO en DB)
    expect(out[0].services.length).toBeGreaterThan(0)
    expect(typeof out[0].horaires).toBe('string')
  })

  it('respecte l\'ordre Prisma (région, nom) et ne marque primary que le premier', async () => {
    mockFindMany.mockResolvedValue([
      {
        id: 'c-kedougou',
        nom: 'CJS Kédougou',
        region: 'Kedougou',
        adresse: 'Lawol',
        latitude: 12.55,
        longitude: -12.17,
      },
      {
        id: 'c-kolda',
        nom: 'CJS Kolda',
        region: 'Kolda',
        adresse: 'Bouna Kane',
        latitude: 12.89,
        longitude: -14.94,
      },
      {
        id: 'c-tamba',
        nom: 'CJS Tambacounda',
        region: 'Tambacounda',
        adresse: 'Senghor',
        latitude: 13.77,
        longitude: -13.66,
      },
    ])

    const out = await listCentres()
    expect(out.map((c) => c.id)).toEqual(['c-kedougou', 'c-kolda', 'c-tamba'])
    expect(out.filter((c) => c.isPrimary)).toHaveLength(1)
    expect(out[0].isPrimary).toBe(true)
    expect(out[1].isPrimary).toBe(false)
    expect(out[2].isPrimary).toBe(false)
  })
})
