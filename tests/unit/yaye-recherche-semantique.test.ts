/**
 * @jest-environment node
 *
 * Recherche SÉMANTIQUE du catalogue (GUIC-683).
 *
 * Le défaut corrigé : `titre LIKE '%poisson%'` rend ZÉRO résultat quand le catalogue dit
 * « Technicien en aquaculture ». C'est le chemin le plus emprunté de toute la plateforme.
 *
 * Trois exigences sont verrouillées ici :
 *  1. le LEXICAL garde la priorité (jamais troqué contre une proximité floue) ;
 *  2. AUCUNE vectorisation à chaud du corpus (latence bornée pour l'usager) ;
 *  3. embeddings coupés → résultat identique au filtre lexical d'origine.
 */

const mockEmbedTexts = jest.fn()
let embeddingsActifs = true
jest.mock('@/lib/ia/embeddings', () => {
  const reel = jest.requireActual('@/lib/ia/embeddings')
  return {
    ...reel,
    isEmbeddingEnabled: () => embeddingsActifs,
    embedTexts: (...a: unknown[]) => mockEmbedTexts(...a),
  }
})
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

import { rankByRelevance } from '@/lib/ia/semantic-rank'
import { normalizeForEmbedding } from '@/lib/ia/embeddings'

const CATALOGUE = [
  { id: 'o-aqua', text: 'Technicien en aquaculture Agence Nationale' },
  { id: 'o-front', text: 'Intégrateur front-end CJS' },
  { id: 'o-compta', text: 'Comptable junior Cabinet Diallo' },
]

/** Vecteurs jouets : « poisson » proche de l'aquaculture, orthogonal au reste. */
const VECTEURS: Record<string, number[]> = {
  poisson: [1, 0, 0],
  'technicien en aquaculture agence nationale': [0.98, 0.2, 0],
  'integrateur front end cjs': [0, 1, 0],
  'comptable junior cabinet diallo': [0, 0, 1],
}

/** Simule le cache : rend les vecteurs connus, sans jamais « calculer ». */
function stubCache(disponibles: string[] = Object.keys(VECTEURS)) {
  mockEmbedTexts.mockImplementation(async (textes: string[]) => {
    const out = new Map<string, number[]>()
    for (const t of textes) {
      const k = normalizeForEmbedding(t)
      if (disponibles.includes(k) && VECTEURS[k]) out.set(k, VECTEURS[k])
    }
    return out
  })
}

beforeEach(() => {
  jest.clearAllMocks()
  embeddingsActifs = true
  stubCache()
})

test('le défaut corrigé : « poisson » remonte l’offre d’aquaculture', async () => {
  const out = await rankByRelevance('poisson', CATALOGUE)

  expect(out.map(r => r.id)).toEqual(['o-aqua'])
  expect(out[0].via).toBe('semantique')
})

test('le LEXICAL garde la priorité : une correspondance de titre passe devant', async () => {
  const out = await rankByRelevance('aquaculture', CATALOGUE)

  expect(out[0].id).toBe('o-aqua')
  expect(out[0].via).toBe('lexical')
  expect(out[0].score).toBe(1)
})

test('un élément trouvé par les DEUX voies n’apparaît qu’une fois', async () => {
  const out = await rankByRelevance('aquaculture', CATALOGUE)
  expect(out.filter(r => r.id === 'o-aqua')).toHaveLength(1)
})

test('recherche insensible à la casse et aux accents (parité avec le LIKE)', async () => {
  const out = await rankByRelevance('INTÉGRATEUR', CATALOGUE)
  expect(out.map(r => r.id)).toContain('o-front')
})

test('LATENCE BORNÉE : le corpus est lu depuis le CACHE, jamais vectorisé à chaud', async () => {
  await rankByRelevance('poisson', CATALOGUE)

  // 1er appel = la requête de l'usager : vectorisation autorisée, tâche REQUÊTE.
  expect(mockEmbedTexts.mock.calls[0][0]).toEqual(['poisson'])
  expect(mockEmbedTexts.mock.calls[0][1]).toEqual({ taskType: 'RETRIEVAL_QUERY' })
  // 2e appel = le corpus : plafond de nouveaux textes à ZÉRO, tâche DOCUMENT.
  // Les deux tâches sont ASYMÉTRIQUES — une requête et un titre ne se vectorisent pas
  // pareil, et le cache les distingue (mesure du 2026-07-27).
  expect(mockEmbedTexts.mock.calls[1][1]).toEqual({ maxNew: 0, taskType: 'RETRIEVAL_DOCUMENT' })
})

test('offre pas encore préchauffée → ignorée sans coût, le lexical répond seul', async () => {
  stubCache(['poisson']) // aucun vecteur de corpus disponible
  const out = await rankByRelevance('poisson', CATALOGUE)
  expect(out).toEqual([])

  const lexical = await rankByRelevance('comptable', CATALOGUE)
  expect(lexical.map(r => r.id)).toEqual(['o-compta'])
})

test('RATTRAPAGE seul : le sémantique ne complète pas une recherche déjà servie', async () => {
  // Trois correspondances lexicales = de quoi remplir l'écran : on ne va pas chercher
  // d'approximations en plus. Le gain mesuré est sur les recherches à ZÉRO résultat.
  const corpus = [
    { id: 'a', text: 'Comptable junior' },
    { id: 'b', text: 'Comptable senior' },
    { id: 'c', text: 'Comptable des matières' },
    { id: 'd', text: 'Gestionnaire financier' },
  ]
  const out = await rankByRelevance('comptable', corpus)

  expect(out.map(r => r.id)).toEqual(['a', 'b', 'c'])
  expect(mockEmbedTexts).not.toHaveBeenCalled() // aucun appel : rien à rattraper
})

test('embeddings coupés → strictement le comportement lexical d’origine', async () => {
  embeddingsActifs = false

  expect((await rankByRelevance('poisson', CATALOGUE)).map(r => r.id)).toEqual([])
  expect((await rankByRelevance('comptable', CATALOGUE)).map(r => r.id)).toEqual(['o-compta'])
  expect(mockEmbedTexts).not.toHaveBeenCalled()
})

test('requête vide ou corpus vide → aucun appel, aucun résultat', async () => {
  expect(await rankByRelevance('   ', CATALOGUE)).toEqual([])
  expect(await rankByRelevance('poisson', [])).toEqual([])
  expect(mockEmbedTexts).not.toHaveBeenCalled()
})

test('requête non vectorisable (endpoint HS) → repli lexical, jamais d’exception', async () => {
  mockEmbedTexts.mockResolvedValue(new Map())
  const out = await rankByRelevance('comptable', CATALOGUE)
  expect(out.map(r => r.id)).toEqual(['o-compta'])
})

test('le seuil écarte le bruit : rien ne remonte sous la barre', async () => {
  const out = await rankByRelevance('poisson', CATALOGUE, { threshold: 0.999 })
  expect(out).toEqual([])
})

test('`max` borne le nombre de résultats', async () => {
  const out = await rankByRelevance('cjs', CATALOGUE, { max: 1 })
  expect(out.length).toBeLessThanOrEqual(1)
})
