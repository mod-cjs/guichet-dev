/**
 * @jest-environment node
 *
 * Tests unitaires du loader du catalogue d'opportunités (GUIC-20).
 * La liste passe par `$queryRaw` (BOOLEAN MODE + NULLS LAST) ; Prisma et Redis
 * sont mockés. On inspecte le SQL généré (`.sql`) et ses paramètres (`.values`).
 */

const mockQueryRaw = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: (...a: unknown[]) => mockQueryRaw(...a) },
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

/** Sql de la requête de lignes (1er appel $queryRaw). */
const rowsSql = () => mockQueryRaw.mock.calls[0][0] as { sql: string; values: unknown[] }

beforeEach(() => {
  jest.clearAllMocks()
  mockRedisGet.mockResolvedValue(null)
  mockRedisSet.mockResolvedValue('OK')
  // Renvoie le COUNT ou les lignes selon la requête.
  mockQueryRaw.mockImplementation((sql: { sql: string }) =>
    sql.sql.includes('COUNT(')
      ? Promise.resolve([{ total: BigInt(1) }])
      : Promise.resolve([ROW]),
  )
})

describe('listOpportunites — filtrage et visibilité', () => {
  it('ne renvoie que les opportunités publiées, non supprimées, non expirées', async () => {
    await listOpportunites(base)
    const { sql } = rowsSql()
    expect(sql).toContain("statut = 'publiee'")
    expect(sql).toContain('deleted_at IS NULL')
    expect(sql).toContain('deadline IS NULL OR deadline >= NOW()')
  })

  it('transmet les filtres domaine, type et région en paramètres', async () => {
    await listOpportunites({ ...base, domaine: 'Numerique', type: 'Emploi', region: 'Thies' })
    const { sql, values } = rowsSql()
    expect(sql).toContain('domaine = ?')
    expect(sql).toContain('type = ?')
    expect(sql).toContain('region = ?')
    expect(values).toEqual(expect.arrayContaining(['Numerique', 'Emploi', 'Thies']))
  })

  it('n’ajoute pas de filtre quand domaine/type/région sont absents', async () => {
    await listOpportunites(base)
    const { sql } = rowsSql()
    expect(sql).not.toContain('domaine = ?')
    expect(sql).not.toContain('type = ?')
    expect(sql).not.toContain('region = ?')
  })
})

describe('listOpportunites — tri et pagination', () => {
  it('trie par date de création décroissante en mode "recent"', async () => {
    await listOpportunites({ ...base, sortBy: 'recent' })
    expect(rowsSql().sql).toContain('created_at DESC')
  })

  it('trie par échéance avec les opportunités sans échéance en dernier (NULLS LAST)', async () => {
    await listOpportunites({ ...base, sortBy: 'deadline' })
    expect(rowsSql().sql).toContain('deadline IS NULL, deadline ASC')
  })

  it('pagine en offset (page 3 → offset 40, limit 20)', async () => {
    await listOpportunites({ ...base, page: 3 })
    expect(rowsSql().values).toEqual(expect.arrayContaining([PAGE_SIZE, (3 - 1) * PAGE_SIZE]))
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

describe('listOpportunites — recherche', () => {
  it('utilise l’index plein-texte BOOLEAN MODE pour un mot ≥ 4 caractères', async () => {
    await listOpportunites({ ...base, q: 'agriculture' })
    const { sql, values } = rowsSql()
    expect(sql).toContain('MATCH(titre, description) AGAINST')
    expect(sql).toContain('IN BOOLEAN MODE')
    expect(values).toContain('agriculture')
  })

  it('retombe sur LIKE pour un terme court (< 4 caractères, ignoré par l’index)', async () => {
    await listOpportunites({ ...base, q: 'ong' })
    const { sql, values } = rowsSql()
    expect(sql).toContain('LIKE')
    expect(sql).not.toContain('MATCH')
    expect(values).toContain('%ong%')
  })

  it('ignore une recherche vide ou faite uniquement d’espaces', async () => {
    await listOpportunites({ ...base, q: '   ' })
    const { sql } = rowsSql()
    expect(sql).not.toContain('MATCH')
    expect(sql).not.toContain('LIKE')
  })
})

describe('listOpportunites — cache Redis', () => {
  it('sert le résultat depuis le cache sans frapper la BDD', async () => {
    const first = await listOpportunites(base)
    mockRedisGet.mockResolvedValue(JSON.stringify(first))
    mockQueryRaw.mockClear()
    const second = await listOpportunites(base)
    expect(mockQueryRaw).not.toHaveBeenCalled()
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
