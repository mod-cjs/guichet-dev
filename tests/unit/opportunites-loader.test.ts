/**
 * @jest-environment node
 *
 * Tests unitaires du loader du catalogue d'opportunités (GUIC-20).
 * Prisma, Redis et le logger sont mockés.
 */

const mockFindMany = jest.fn()
const mockCount = jest.fn()
const mockQueryRaw = jest.fn()

jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      count: (...a: unknown[]) => mockCount(...a),
    },
    $queryRaw: (...a: unknown[]) => mockQueryRaw(...a),
  },
}))

const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()
jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...a: unknown[]) => mockRedisGet(...a),
    set: (...a: unknown[]) => mockRedisSet(...a),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import { listOpportunites, PAGE_SIZE } from '@/lib/opportunites-loader'
import type { OpportuniteFiltres } from '@/types/opportunite'

const ROW = {
  id: 'o1',
  slug: 'stage-agriculture',
  titre: 'Stage en agriculture',
  type: 'Stage',
  domaine: 'Agriculture',
  region: 'Dakar',
  organisation: 'CJS',
  remuneration: null,
  deadline: new Date('2026-12-01T00:00:00.000Z'),
}

const base: OpportuniteFiltres = { page: 1, sortBy: 'recent' }

beforeEach(() => {
  jest.clearAllMocks()
  mockRedisGet.mockResolvedValue(null)
  mockRedisSet.mockResolvedValue('OK')
  mockFindMany.mockResolvedValue([ROW])
  mockCount.mockResolvedValue(1)
})

describe('listOpportunites — filtrage', () => {
  it('ne renvoie que les opportunités publiées, non supprimées, non expirées', async () => {
    await listOpportunites(base)
    const where = mockFindMany.mock.calls[0][0].where
    expect(where.statut).toBe('publiee')
    expect(where.deletedAt).toBeNull()
    expect(where.OR).toEqual([
      { deadline: null },
      { deadline: { gte: expect.any(Date) } },
    ])
  })

  it('transmet les filtres domaine, type et région', async () => {
    await listOpportunites({ ...base, domaine: 'Numerique', type: 'Emploi', region: 'Thies' })
    const where = mockFindMany.mock.calls[0][0].where
    expect(where.domaine).toBe('Numerique')
    expect(where.type).toBe('Emploi')
    expect(where.region).toBe('Thies')
  })

  it('n’ajoute pas de filtre quand domaine/type/région sont absents', async () => {
    await listOpportunites(base)
    const where = mockFindMany.mock.calls[0][0].where
    expect(where).not.toHaveProperty('domaine')
    expect(where).not.toHaveProperty('type')
    expect(where).not.toHaveProperty('region')
  })
})

describe('listOpportunites — tri et pagination', () => {
  it('trie par date de création décroissante en mode "recent"', async () => {
    await listOpportunites({ ...base, sortBy: 'recent' })
    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual([{ createdAt: 'desc' }])
  })

  it('trie par deadline croissante en mode "deadline"', async () => {
    await listOpportunites({ ...base, sortBy: 'deadline' })
    expect(mockFindMany.mock.calls[0][0].orderBy).toEqual([{ deadline: 'asc' }])
  })

  it('pagine en offset (page 3 → skip 40, take 20)', async () => {
    await listOpportunites({ ...base, page: 3 })
    const arg = mockFindMany.mock.calls[0][0]
    expect(arg.skip).toBe((3 - 1) * PAGE_SIZE)
    expect(arg.take).toBe(PAGE_SIZE)
  })

  it('ne renvoie que les champs carte', async () => {
    const res = await listOpportunites(base)
    expect(res.items[0]).toEqual({
      id: 'o1',
      slug: 'stage-agriculture',
      titre: 'Stage en agriculture',
      type: 'Stage',
      domaine: 'Agriculture',
      region: 'Dakar',
      organisation: 'CJS',
      remuneration: null,
      deadline: '2026-12-01T00:00:00.000Z',
    })
    expect(res.total).toBe(1)
    expect(res.pageSize).toBe(PAGE_SIZE)
  })
})

describe('listOpportunites — recherche plein-texte', () => {
  it('utilise $queryRaw (BOOLEAN MODE) et non findMany quand q est fourni', async () => {
    mockQueryRaw
      .mockResolvedValueOnce([ROW])
      .mockResolvedValueOnce([{ total: BigInt(1) }])
    const res = await listOpportunites({ ...base, q: 'agriculture' })
    expect(mockQueryRaw).toHaveBeenCalled()
    expect(mockFindMany).not.toHaveBeenCalled()
    expect(res.total).toBe(1)
    expect(res.items[0].id).toBe('o1')
  })

  it('ignore une recherche vide ou faite uniquement d’espaces', async () => {
    await listOpportunites({ ...base, q: '   ' })
    expect(mockFindMany).toHaveBeenCalled()
    expect(mockQueryRaw).not.toHaveBeenCalled()
  })
})

describe('listOpportunites — cache Redis', () => {
  it('sert le résultat depuis le cache sans frapper la BDD', async () => {
    const first = await listOpportunites(base)
    mockRedisGet.mockResolvedValue(JSON.stringify(first))
    mockFindMany.mockClear()
    const second = await listOpportunites(base)
    expect(mockFindMany).not.toHaveBeenCalled()
    expect(second).toEqual(first)
  })

  it('écrit en cache avec un TTL de 5 minutes en cas de miss', async () => {
    await listOpportunites(base)
    const setArgs = mockRedisSet.mock.calls[0]
    expect(setArgs).toContain('EX')
    expect(setArgs).toContain(300)
  })

  it('reste fonctionnel si Redis est indisponible', async () => {
    mockRedisGet.mockRejectedValue(new Error('redis down'))
    mockRedisSet.mockRejectedValue(new Error('redis down'))
    const res = await listOpportunites(base)
    expect(res.total).toBe(1)
    expect(res.items).toHaveLength(1)
  })
})
