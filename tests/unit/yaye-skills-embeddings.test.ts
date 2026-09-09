/**
 * @jest-environment node
 *
 * Appariement SÉMANTIQUE des compétences (GUIC-677).
 *
 * Le défaut corrigé : « Développement web » et « Programmation front-end » n'ont aucun
 * bigramme commun — le lexical ne les rapproche jamais, d'où PREPARE = 0 et une analyse
 * d'écart de compétences qui déclare « manquante » une compétence déjà acquise.
 *
 * Deux exigences non négociables sont testées ici : la COUPURE explicite
 * (`YAYE_EMBEDDING_MODEL="off"` → lexical strict) et le FAIL-SOFT (endpoint HS → on
 * retombe sur le lexical, jamais d'exception).
 */

const store = new Map<string, string>()
const mockMget = jest.fn(async (...keys: string[]) => keys.map(k => store.get(k) ?? null))
const mockSet = jest.fn(async (k: string, v: string) => { store.set(k, v); return 'OK' })
jest.mock('@/lib/redis', () => ({
  redis: { mget: (...a: string[]) => mockMget(...a), set: (...a: [string, string]) => mockSet(...a), get: jest.fn(), del: jest.fn() },
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

// Le fournisseur d'embeddings est mocké au niveau du PORT (Vertex natif en prod,
// LMStudio en local) : ces tests portent sur l'appariement, pas sur le transport.
const mockEmbed = jest.fn()
jest.mock('@/lib/ia/vertex-embeddings', () => ({
  embedWithVertex: (...a: unknown[]) => mockEmbed(...a),
  vertexBatchSize: () => 96,
}))
jest.mock('@/lib/ia/llm-client', () => ({
  isLocalProvider: () => false,
  getLlmClient: () => ({ embeddings: { create: jest.fn() } }),
}))

import { buildSkillIndex, type SkillRef } from '@/lib/ia/graph/skills-normalize'
import {
  cosine,
  embeddingModel,
  isEmbeddingEnabled,
  matchSkillsHybrid,
  prepareSemanticMatcher,
} from '@/lib/ia/graph/skills-embeddings'

const SKILLS: SkillRef[] = [
  { id: 'sk-front', slug: 'programmation-front-end', libelle: 'Programmation front-end' },
  { id: 'sk-compta', slug: 'comptabilite', libelle: 'Comptabilité' },
]
const index = buildSkillIndex(SKILLS)

/** Vecteurs jouets : front-end et « développement web » colinéaires, compta orthogonale. */
const VECTORS: Record<string, number[]> = {
  'programmation front end': [1, 0],
  comptabilite: [0, 1],
  'developpement web': [0.97, 0.24],
}

function stubEmbeddings() {
  mockEmbed.mockImplementation(async (_model: string, texts: string[]) => texts.map(t => VECTORS[t] ?? [0, 0]))
}

beforeEach(() => {
  store.clear()
  jest.clearAllMocks()
  process.env.YAYE_EMBEDDING_MODEL = 'text-embedding-test'
  stubEmbeddings()
})

afterAll(() => {
  delete process.env.YAYE_EMBEDDING_MODEL
})

test('cosine : colinéaires = 1, orthogonaux = 0, dimensions incompatibles = 0', () => {
  expect(cosine([1, 0], [2, 0])).toBeCloseTo(1)
  expect(cosine([1, 0], [0, 1])).toBeCloseTo(0)
  expect(cosine([1, 0], [1, 0, 0])).toBe(0)
})

test('le lexical seul NE rapproche PAS « développement web » de « Programmation front-end »', () => {
  const lex = matchSkillsHybrid('Développement web', index, null)
  expect(lex.map(m => m.id)).not.toContain('sk-front')
})

test('l’hybride les rapproche via les embeddings — le défaut corrigé', async () => {
  const semantic = await prepareSemanticMatcher(SKILLS, ['Développement web'])
  const out = matchSkillsHybrid('Développement web', index, semantic)

  expect(out.map(m => m.id)).toContain('sk-front')
  expect(out.map(m => m.id)).not.toContain('sk-compta') // pas de bruit
})

test('COUPURE explicite : YAYE_EMBEDDING_MODEL="off" → aucun appel, lexical strict', async () => {
  process.env.YAYE_EMBEDDING_MODEL = 'off'
  expect(isEmbeddingEnabled()).toBe(false)

  const semantic = await prepareSemanticMatcher(SKILLS, ['Développement web'])
  expect(semantic).toBeNull()
  expect(mockEmbed).not.toHaveBeenCalled()
})

test('par défaut : modèle Gemini de Vertex, actif sans configuration', async () => {
  delete process.env.YAYE_EMBEDDING_MODEL
  expect(embeddingModel()).toBe('gemini-embedding-001')
  expect(isEmbeddingEnabled()).toBe(true)
})

test('FAIL-SOFT : endpoint d’embedding en échec → matcher null, lexical préservé', async () => {
  mockEmbed.mockResolvedValue(null)

  const semantic = await prepareSemanticMatcher(SKILLS, ['Développement web'])
  expect(semantic).toBeNull()
  expect(matchSkillsHybrid('Comptabilité', index, semantic).map(m => m.id)).toContain('sk-compta')
})

test('les vecteurs sont mis en cache : une seule vectorisation par texte', async () => {
  await prepareSemanticMatcher(SKILLS, ['Développement web'])
  expect(mockEmbed.mock.calls.length).toBeGreaterThan(0)
  expect(mockSet).toHaveBeenCalled()

  mockEmbed.mockClear()
  await prepareSemanticMatcher(SKILLS, ['Développement web'])
  expect(mockEmbed).not.toHaveBeenCalled() // tout vient du cache
})

test('cache compact : les vecteurs sont stockés en Float32/base64, pas en JSON', async () => {
  await prepareSemanticMatcher(SKILLS, ['Développement web'])
  const valeurs = mockSet.mock.calls.map(c => c[1] as string)
  expect(valeurs.length).toBeGreaterThan(0)
  for (const v of valeurs) expect(v.startsWith('[')).toBe(false)
  // …et restent relus correctement (cf. test de cache ci-dessus, qui repasse par decodeVector).
})

test('CDP : seuls des libellés de compétences / thèmes sont envoyés au modèle', async () => {
  await prepareSemanticMatcher(SKILLS, ['Développement web'])
  const envoyes = mockEmbed.mock.calls.flatMap(c => c[1] as string[])

  // Le référentiel + le texte métier demandé, rien d'autre : aucun identifiant, aucun nom.
  expect(new Set(envoyes)).toEqual(new Set(['programmation front end', 'comptabilite', 'developpement web']))
})

test('l’hybride garde le meilleur score quand les deux voies trouvent la même compétence', async () => {
  const semantic = await prepareSemanticMatcher(SKILLS, ['Comptabilité'])
  const out = matchSkillsHybrid('Comptabilité', index, semantic)

  expect(out.filter(m => m.id === 'sk-compta')).toHaveLength(1) // dédupliqué
  expect(out[0].score).toBeCloseTo(1)
})
