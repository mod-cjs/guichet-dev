/**
 * @jest-environment node
 *
 * Projection ÉVÉNEMENTIELLE du bénéficiaire (fraîcheur du read-model).
 * Sans elle, candidatures / compétences / favoris n'entraient dans le graphe qu'à la
 * reprojection nocturne : Yaye recommandait une offre déjà postulée le matin même.
 * cypher + prisma + graph-context mockés.
 */

let neo4jOn = true
jest.mock('@/lib/neo4j', () => ({ isNeo4jConfigured: () => neo4jOn, neo4jDatabase: () => undefined }))

jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

jest.mock('@/lib/ia/graph/projection/cypher', () => ({
  ensureConstraints: jest.fn(async () => {}),
  ensureIndexes: jest.fn(async () => {}),
  mergeNodes: jest.fn(async () => 1),
  mergeRels: jest.fn(async () => 1),
  deleteRelsOfTypes: jest.fn(async () => {}),
  detachDeleteNode: jest.fn(async () => {}),
  wipeGraph: jest.fn(async () => {}),
}))

const mockPurgeGraphContext = jest.fn(async () => {})
jest.mock('@/lib/ia/graph-context', () => ({ purgeGraphContext: (...a: unknown[]) => mockPurgeGraphContext(...(a as [])) }))

jest.mock('@/lib/prisma', () => ({
  prisma: {
    utilisateur: { findUnique: jest.fn() },
    diplome: { findMany: jest.fn() },
    certificatMoodle: { findMany: jest.fn() },
    experience: { findMany: jest.fn() },
    candidature: { findMany: jest.fn() },
    opportuniteFavorite: { findMany: jest.fn() },
    ressourceFavorite: { findMany: jest.fn() },
    inscriptionEvenement: { findMany: jest.fn() },
    skill: { findMany: jest.fn() },
  },
}))

import { projectBeneficiaire, syncBeneficiaireToGraph } from '@/lib/ia/graph/projection/project'
import * as cypher from '@/lib/ia/graph/projection/cypher'
import { prisma } from '@/lib/prisma'

const cy = cypher as unknown as Record<string, jest.Mock>
const db = prisma as unknown as Record<string, { findUnique: jest.Mock; findMany: jest.Mock }>
const UID = 'cjs-uid-1'

const user = {
  cjsUid: UID,
  region: 'Thies',
  deletedAt: null,
  profil: { id: 'p1', niveauEtude: 'BAC', situationEmploi: 'Recherche', completionScore: 60, competences: ['Excel'] },
}

/** Retrouve l'appel mergeRels d'un type de relation donné. */
const relCall = (type: string) => cy.mergeRels.mock.calls.find(c => c[0] === type)

beforeEach(() => {
  jest.clearAllMocks()
  neo4jOn = true
  db.utilisateur.findUnique.mockResolvedValue(user)
  db.diplome.findMany.mockResolvedValue([])
  db.certificatMoodle.findMany.mockResolvedValue([])
  db.experience.findMany.mockResolvedValue([])
  db.candidature.findMany.mockResolvedValue([])
  db.opportuniteFavorite.findMany.mockResolvedValue([])
  db.ressourceFavorite.findMany.mockResolvedValue([])
  db.inscriptionEvenement.findMany.mockResolvedValue([])
  db.skill.findMany.mockResolvedValue([])
})

test('Neo4j non configuré → false, aucune lecture Prisma', async () => {
  neo4jOn = false
  expect(await projectBeneficiaire(UID)).toBe(false)
  expect(db.utilisateur.findUnique).not.toHaveBeenCalled()
})

test('utilisateur inconnu ou anonymisé → false', async () => {
  db.utilisateur.findUnique.mockResolvedValueOnce(null)
  expect(await projectBeneficiaire(UID)).toBe(false)

  db.utilisateur.findUnique.mockResolvedValueOnce({ ...user, deletedAt: new Date() })
  expect(await projectBeneficiaire(UID)).toBe(false)
})

test('candidature du jour → arête A_POSTULE projetée immédiatement (avec statut)', async () => {
  db.candidature.findMany.mockResolvedValue([
    { opportuniteId: 'opp-1', statut: 'En_attente', soumiseA: new Date('2026-07-25') },
  ])

  expect(await projectBeneficiaire(UID)).toBe(true)

  const call = relCall('A_POSTULE')
  expect(call).toBeTruthy()
  expect(call![5]).toEqual([
    expect.objectContaining({ from: UID, to: 'opp-1', statut: 'En_attente' }),
  ])
})

test('les arêtes de la personne sont PURGÉES avant re-merge (favori retiré ≠ arête fantôme)', async () => {
  await projectBeneficiaire(UID)

  const purge = cy.deleteRelsOfTypes.mock.calls.find(c => c[0] === 'Beneficiaire')
  expect(purge).toBeTruthy()
  expect(purge![3]).toEqual(
    expect.arrayContaining(['MAITRISE', 'A_POSTULE', 'INTERESSE_PAR', 'A_OBTENU', 'A_EXERCE', 'INSCRIT_A']),
  )
  expect(purge![2]).toBe(UID) // borné à CETTE personne
})

test('MAITRISE dérivée du profil ∪ des certificats (matching flou, parité reprojectAll)', async () => {
  db.skill.findMany.mockResolvedValue([
    { id: 'sk-excel', slug: 'excel', libelle: 'Excel' },
    { id: 'sk-compta', slug: 'comptabilite', libelle: 'Comptabilité' },
  ])
  db.certificatMoodle.findMany.mockResolvedValue([
    { id: 'cert-1', formation: 'Comptabilité générale', obtenuLe: new Date('2026-01-10'), moodleCertId: 'm1' },
  ])

  await projectBeneficiaire(UID)

  const maitrise = relCall('MAITRISE')
  expect(maitrise).toBeTruthy()
  const cibles = (maitrise![5] as Array<{ to: string }>).map(p => p.to)
  expect(cibles).toEqual(expect.arrayContaining(['sk-excel', 'sk-compta']))

  // Le certificat ATTESTE la compétence, et son arête est purgée avant re-merge.
  expect(relCall('ATTESTE')).toBeTruthy()
  expect(cy.deleteRelsOfTypes.mock.calls.some(c => c[0] === 'Certificat' && c[2] === 'cert-1')).toBe(true)
})

test('le déclencheur invalide le contexte graphe mémoïsé (données périmées)', async () => {
  syncBeneficiaireToGraph(UID)
  await new Promise(r => setImmediate(r))
  expect(mockPurgeGraphContext).toHaveBeenCalledWith(UID)
})

test('déclencheur FAIL-SOFT : une projection en échec ne remonte jamais', async () => {
  db.utilisateur.findUnique.mockRejectedValueOnce(new Error('neo4j down'))
  expect(() => syncBeneficiaireToGraph(UID)).not.toThrow()
  await new Promise(r => setImmediate(r))
})
