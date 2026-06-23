/**
 * @jest-environment node
 *
 * Tests de la projection ÉVÉNEMENTIELLE mono-opportunité (GUIC-279).
 * Vérifie le garde-fou Neo4j, la pose du label de sous-type, les relations cœur,
 * et le caractère fail-soft du déclencheur. cypher + prisma mockés.
 */

let neo4jOn = true
jest.mock('@/lib/neo4j', () => ({ isNeo4jConfigured: () => neo4jOn, neo4jDatabase: () => undefined }))

jest.mock('@/lib/ia/graph/projection/cypher', () => ({
  ensureConstraints: jest.fn(async () => {}),
  ensureIndexes: jest.fn(async () => {}),
  mergeNodes: jest.fn(async () => 1),
  mergeRels: jest.fn(async () => 1),
  deleteRelsOfTypes: jest.fn(async () => {}),
  detachDeleteNode: jest.fn(async () => {}),
  wipeGraph: jest.fn(async () => {}),
}))

const mockFindUnique = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { opportunite: { findUnique: (...a: unknown[]) => mockFindUnique(...a) } } }))

import { projectOpportunite, syncOpportuniteToGraph } from '@/lib/ia/graph/projection/project'
import * as cypher from '@/lib/ia/graph/projection/cypher'

const cy = cypher as unknown as Record<string, jest.Mock>

const formationOpp = {
  id: 'o1', slug: 's1', titre: 'T', domaine: 'Numerique', region: 'Dakar', statut: 'publiee',
  deadline: null, remuneration: null, niveauEtudeMin: null, organisationLibelle: 'CJS', vues: 0,
  typeId: 't1', programmeId: 'p1', organisationId: 'org1', deletedAt: null,
  emploi: null, stage: null,
  formation: { opportuniteId: 'o1', dureeHeures: 30, modalite: 'PRESENTIEL', certifiante: true },
  bourse: null, concours: null, appelAProjets: null, financement: null, mentorat: null, mobilite: null, volontariat: null,
  skills: [{ skillId: 's1', requise: true }, { skillId: 's2', requise: false }],
  tags: [{ tagId: 'tag1' }],
}

beforeEach(() => {
  jest.clearAllMocks()
  neo4jOn = true
})

test('Neo4j non configuré → false, aucune lecture Prisma', async () => {
  neo4jOn = false
  expect(await projectOpportunite('o1')).toBe(false)
  expect(mockFindUnique).not.toHaveBeenCalled()
})

test('opportunité absente → false', async () => {
  mockFindUnique.mockResolvedValueOnce(null)
  expect(await projectOpportunite('o1')).toBe(false)
})

test('opportunité supprimée → false', async () => {
  mockFindUnique.mockResolvedValueOnce({ ...formationOpp, deletedAt: new Date() })
  expect(await projectOpportunite('o1')).toBe(false)
})

test('formation : schéma + nœud commun + label Formation + REQUIERT/DEVELOPPE/ETIQUETTE', async () => {
  mockFindUnique.mockResolvedValueOnce(formationOpp)
  expect(await projectOpportunite('o1')).toBe(true)

  expect(cy.ensureConstraints).toHaveBeenCalled()
  // un mergeNodes pose le label de sous-type Formation (4e arg)
  const labelled = cy.mergeNodes.mock.calls.find(c => Array.isArray(c[3]) && c[3].includes('Formation'))
  expect(labelled).toBeTruthy()

  const rels = cy.mergeRels.mock.calls.map(c => c[0])
  expect(rels).toEqual(expect.arrayContaining(['EST_DE_TYPE', 'FINANCE', 'PUBLIE', 'RELEVE_DE', 'SITUE_A', 'REQUIERT', 'DEVELOPPE', 'ETIQUETTE']))

  // purge des arêtes re-projetées AVANT re-merge (MERGE additif → sinon arêtes fantômes)
  expect(cy.deleteRelsOfTypes).toHaveBeenCalledWith('Opportunite', 'id', 'o1', expect.arrayContaining(['REQUIERT', 'ETIQUETTE']))
})

test('purge : ne touche pas aux arêtes pilotées ailleurs (A_POSTULE, INSCRIT_A…)', async () => {
  mockFindUnique.mockResolvedValueOnce(formationOpp)
  await projectOpportunite('o1')
  const purged = cy.deleteRelsOfTypes.mock.calls[0][3] as string[]
  expect(purged).not.toContain('A_POSTULE')
  expect(purged).not.toContain('INSCRIT_A')
  expect(purged).not.toContain('INTERESSE_PAR')
})

test('syncOpportuniteToGraph : fail-soft (ne lève jamais)', async () => {
  mockFindUnique.mockRejectedValueOnce(new Error('db down'))
  expect(() => syncOpportuniteToGraph('o1')).not.toThrow()
  await new Promise(r => setTimeout(r, 0)) // laisse la promesse rejetée être catchée
})
