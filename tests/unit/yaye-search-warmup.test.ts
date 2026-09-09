/**
 * @jest-environment node
 *
 * Préchauffage des vecteurs du catalogue (GUIC-683) — l'outil d'ops et le pas nocturne.
 *
 * Le point délicat est la CIBLE : deux offres au même intitulé partagent un seul vecteur.
 * Compter les textes bruts ferait croire à un préchauffage qui patine alors qu'il est
 * terminé — c'est ce qui a produit un faux « plus de progression » lors de la recette.
 */

const mockEmbedTexts = jest.fn()
let actif = true
jest.mock('@/lib/ia/embeddings', () => {
  const reel = jest.requireActual('@/lib/ia/embeddings')
  return { ...reel, isEmbeddingEnabled: () => actif, embedTexts: (...a: unknown[]) => mockEmbedTexts(...a) }
})
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

const mockFindMany = jest.fn()
jest.mock('@/lib/prisma', () => ({ prisma: { opportunite: { findMany: (...a: unknown[]) => mockFindMany(...a) } } }))

import { texteOpportunite, warmOpportuniteVectors } from '@/lib/ia/search-warmup'
import { normalizeForEmbedding } from '@/lib/ia/embeddings'

/** Deux offres au libellé IDENTIQUE + une distincte → 3 textes, 2 vecteurs suffisent. */
const OFFRES = [
  { titre: 'Comptable', organisation: 'CJS', organisationLibelle: null, domaine: 'Gestion', type: 'emploi' },
  { titre: 'Comptable', organisation: 'CJS', organisationLibelle: null, domaine: 'Gestion', type: 'emploi' },
  { titre: 'Développeur web', organisation: 'CJS', organisationLibelle: null, domaine: 'Numerique', type: 'emploi' },
]

/** Cache simulé : rend un vecteur pour chaque texte distinct demandé. */
function stubVecteurs(couverts = Infinity) {
  mockEmbedTexts.mockImplementation(async (textes: string[]) => {
    const out = new Map<string, number[]>()
    for (const t of [...new Set(textes.map(normalizeForEmbedding))].slice(0, couverts)) out.set(t, [1, 0])
    return out
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  actif = true
  mockFindMany.mockResolvedValue(OFFRES)
  stubVecteurs()
})

test('la cible est le nombre de textes DISTINCTS, pas le nombre d’offres', async () => {
  const r = await warmOpportuniteVectors()

  expect(r.candidats).toBe(3) // trois offres…
  expect(r.uniques).toBe(2) // …mais deux intitulés
  expect(r.vecteurs).toBe(2)
  expect(r.complet).toBe(true) // et donc : terminé, pas « en panne »
})

test('couverture partielle → complet = false (le cron reprendra la nuit suivante)', async () => {
  stubVecteurs(1)
  const r = await warmOpportuniteVectors()

  expect(r.vecteurs).toBe(1)
  expect(r.uniques).toBe(2)
  expect(r.complet).toBe(false)
})

test('le texte indexé est celui de la recherche, avec la tâche DOCUMENT', async () => {
  await warmOpportuniteVectors()

  const [textes, opts] = mockEmbedTexts.mock.calls[0]
  expect(textes).toContain(texteOpportunite(OFFRES[2]))
  // Une tâche différente produirait d'autres vecteurs, donc d'autres clés : le
  // préchauffage ne servirait alors à rien.
  expect(opts).toMatchObject({ taskType: 'RETRIEVAL_DOCUMENT' })
  expect(opts.maxNew).toBeGreaterThan(0) // ici, contrairement au chemin de réponse
})

test('seules les offres publiées et non expirées sont préchauffées', async () => {
  await warmOpportuniteVectors()

  const where = mockFindMany.mock.calls[0][0].where
  expect(where).toMatchObject({ statut: 'publiee', deletedAt: null })
  expect(where.OR).toEqual([{ deadline: null }, { deadline: { gte: expect.any(Date) } }])
})

test('embeddings coupés → no-op déclaré complet, aucune lecture en base', async () => {
  actif = false
  const r = await warmOpportuniteVectors()

  expect(r).toMatchObject({ candidats: 0, uniques: 0, vecteurs: 0, complet: true })
  expect(mockFindMany).not.toHaveBeenCalled()
})

test('FAIL-SOFT : une base en erreur ne fait jamais échouer le cron', async () => {
  mockFindMany.mockRejectedValueOnce(new Error('db down'))
  await expect(warmOpportuniteVectors()).resolves.toMatchObject({ vecteurs: 0, complet: false })
})
