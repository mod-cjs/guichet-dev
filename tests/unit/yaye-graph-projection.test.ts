/**
 * @jest-environment node
 *
 * Tests d'orchestration du pipeline de projection (GUIC-279).
 * Prisma universel (tout vide) + helpers Cypher mockés : on vérifie le garde-fou
 * « Neo4j non configuré → skip » et l'enchaînement schéma → nœuds → relations.
 */

let neo4jConfigured = true
jest.mock('@/lib/neo4j', () => ({
  isNeo4jConfigured: () => neo4jConfigured,
  neo4jDatabase: () => undefined,
}))

// Mocks créés DANS la factory (jest hoiste les jest.mock au-dessus des const → TDZ sinon).
jest.mock('@/lib/ia/graph/projection/cypher', () => ({
  ensureConstraints: jest.fn(async () => {}),
  ensureIndexes: jest.fn(async () => {}),
  mergeNodes: jest.fn(async () => 0),
  mergeRels: jest.fn(async () => 0),
  wipeGraph: jest.fn(async () => {}),
}))

// Prisma universel : tout modèle répond [] / null.
jest.mock('@/lib/prisma', () => {
  const emptyModel = { findMany: async () => [], findUnique: async () => null, findFirst: async () => null }
  return { prisma: new Proxy({}, { get: () => emptyModel }) }
})

import { reprojectAll } from '@/lib/ia/graph/projection/project'
import * as cypher from '@/lib/ia/graph/projection/cypher'

const mockCy = cypher as unknown as Record<string, jest.Mock>

beforeEach(() => jest.clearAllMocks())

test('reprojectAll : Neo4j non configuré → backend skipped, aucune écriture', async () => {
  neo4jConfigured = false
  const report = await reprojectAll()
  expect(report.backend).toBe('skipped')
  expect(mockCy.mergeNodes).not.toHaveBeenCalled()
  expect(mockCy.ensureConstraints).not.toHaveBeenCalled()
})

test('reprojectAll : Neo4j configuré → schéma puis projection, rapport neo4j', async () => {
  neo4jConfigured = true
  const report = await reprojectAll()
  expect(report.backend).toBe('neo4j')
  // Le schéma (contraintes + index) est posé avant toute projection.
  expect(mockCy.ensureConstraints).toHaveBeenCalledTimes(1)
  expect(mockCy.ensureIndexes).toHaveBeenCalledTimes(1)
  // Les nœuds décompressés (Opportunite + 10 sous-types) déclenchent des mergeNodes.
  expect(mockCy.mergeNodes).toHaveBeenCalled()
  expect(report.nodes).toHaveProperty('Opportunite')
  expect(report.relations).toHaveProperty('MAITRISE')
})

test('reprojectAll : option wipe → purge avant reprojection', async () => {
  neo4jConfigured = true
  await reprojectAll({ wipe: true })
  expect(mockCy.wipeGraph).toHaveBeenCalledTimes(1)
})
