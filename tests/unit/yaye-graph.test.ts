/**
 * @jest-environment node
 *
 * Tests du GraphPort (GUIC-259, Lot 1, GUIC-275).
 * Vérifie : sélection d'adapter selon la config (R1), fallback Prisma
 * (recherche + health), et l'adapter Neo4j (health + mapping) avec driver mocké.
 */

const mockFindMany = jest.fn()
const mockFindFirst = jest.fn()
jest.mock('@/lib/prisma', () => ({
  prisma: {
    opportunite: {
      findMany: (...a: unknown[]) => mockFindMany(...a),
      findFirst: (...a: unknown[]) => mockFindFirst(...a),
    },
  },
}))

const mockRun = jest.fn()
const mockClose = jest.fn()
const mockSession = jest.fn(() => ({ run: mockRun, close: mockClose }))
jest.mock('@/lib/neo4j', () => ({
  isNeo4jConfigured: () => Boolean(process.env.NEO4J_URI && process.env.NEO4J_PASSWORD),
  neo4jDatabase: () => process.env.NEO4J_DATABASE || undefined,
  getNeo4jDriver: () => ({ session: mockSession }),
}))

import { getGraphPort, resetGraphPort } from '@/lib/ia/graph'
import { PrismaGraphAdapter } from '@/lib/ia/graph/prisma-adapter'
import { Neo4jGraphAdapter } from '@/lib/ia/graph/neo4j-adapter'
import { clampLimit } from '@/lib/ia/graph/port'

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  mockFindMany.mockReset()
  mockFindFirst.mockReset()
  mockRun.mockReset()
  mockClose.mockReset()
  resetGraphPort()
  delete process.env.NEO4J_URI
  delete process.env.NEO4J_PASSWORD
  delete process.env.NEO4J_DATABASE
})

afterAll(() => {
  process.env = ORIGINAL_ENV
})

// ── Sélection d'adapter (R1) ──────────────────────────────────────────────────
test('getGraphPort : Neo4j non configuré → fallback Prisma', () => {
  expect(getGraphPort().backend).toBe('prisma')
})

test('getGraphPort : Neo4j configuré → adapter Neo4j', () => {
  process.env.NEO4J_URI = 'bolt://localhost:7687'
  process.env.NEO4J_PASSWORD = 'secret'
  expect(getGraphPort().backend).toBe('neo4j')
})

test('getGraphPort : mémoïse le même port', () => {
  const a = getGraphPort()
  const b = getGraphPort()
  expect(a).toBe(b)
})

// ── clampLimit ────────────────────────────────────────────────────────────────
test('clampLimit : défaut, plancher et plafond', () => {
  expect(clampLimit(undefined)).toBe(5)
  expect(clampLimit(0)).toBe(1)
  expect(clampLimit(999)).toBe(20)
  expect(clampLimit(3)).toBe(3)
})

// ── PrismaGraphAdapter ────────────────────────────────────────────────────────
test('PrismaGraphAdapter.searchOpportunites : filtre publié + non expiré, mappe les champs', async () => {
  mockFindMany.mockResolvedValueOnce([
    {
      id: 'o1', slug: 'dev-dakar', titre: 'Dev', type: 'emploi', region: 'Dakar',
      organisation: 'ACME', organisationLibelle: null, deadline: new Date('2030-01-01T00:00:00Z'),
    },
  ])
  const out = await new PrismaGraphAdapter().searchOpportunites({ q: 'dev' })
  expect(out).toHaveLength(1)
  expect(out[0]).toMatchObject({ id: 'o1', slug: 'dev-dakar', organisation: 'ACME', region: 'Dakar' })
  expect(out[0].deadline).toBe('2030-01-01T00:00:00.000Z')
  const where = mockFindMany.mock.calls[0][0].where
  expect(where.statut).toBe('publiee')
  expect(where.titre).toEqual({ contains: 'dev' })
})

test('PrismaGraphAdapter.searchOpportunites : ignore les enums invalides', async () => {
  mockFindMany.mockResolvedValueOnce([])
  await new PrismaGraphAdapter().searchOpportunites({ domaine: 'NIMP', region: 'NIMP', type: 'NIMP' })
  const where = mockFindMany.mock.calls[0][0].where
  expect(where.domaine).toBeUndefined()
  expect(where.region).toBeUndefined()
  expect(where.type).toBeUndefined()
})

test('PrismaGraphAdapter.healthcheck : ok si la lecture passe', async () => {
  mockFindFirst.mockResolvedValueOnce({ id: 'x' })
  const h = await new PrismaGraphAdapter().healthcheck()
  expect(h).toMatchObject({ ok: true, backend: 'prisma' })
})

test('PrismaGraphAdapter.healthcheck : ok:false si la lecture échoue (jamais lever)', async () => {
  mockFindFirst.mockRejectedValueOnce(new Error('db down'))
  const h = await new PrismaGraphAdapter().healthcheck()
  expect(h.ok).toBe(false)
  expect(h.backend).toBe('prisma')
})

// ── Neo4jGraphAdapter (driver mocké) ──────────────────────────────────────────
test('Neo4jGraphAdapter.healthcheck : ok + session READ fermée', async () => {
  mockRun.mockResolvedValueOnce({ records: [] })
  const h = await new Neo4jGraphAdapter().healthcheck()
  expect(h).toMatchObject({ ok: true, backend: 'neo4j' })
  expect(mockRun).toHaveBeenCalledWith('RETURN 1 AS ok', {})
  expect(mockClose).toHaveBeenCalled()
})

test('Neo4jGraphAdapter.healthcheck : ok:false si run échoue, session fermée', async () => {
  mockRun.mockRejectedValueOnce(new Error('bolt refused'))
  const h = await new Neo4jGraphAdapter().healthcheck()
  expect(h.ok).toBe(false)
  expect(mockClose).toHaveBeenCalled()
})

test('Neo4jGraphAdapter.searchOpportunites : mappe les records et ferme la session', async () => {
  const rec = {
    get: (k: string) =>
      ({ id: 'o1', slug: 's', titre: 'T', type: 'emploi', organisation: 'ACME', region: 'Dakar', deadline: null } as Record<string, unknown>)[k],
  }
  mockRun.mockResolvedValueOnce({ records: [rec] })
  const out = await new Neo4jGraphAdapter().searchOpportunites({ q: 'x', limit: 3 })
  expect(out[0]).toMatchObject({ id: 'o1', organisation: 'ACME', region: 'Dakar', deadline: null })
  expect(mockClose).toHaveBeenCalled()
  // paramètres passés au template (q normalisé, limit borné)
  const params = mockRun.mock.calls[0][1]
  expect(params.q).toBe('x')
})
