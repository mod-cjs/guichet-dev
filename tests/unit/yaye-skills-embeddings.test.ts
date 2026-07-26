/**
 * @jest-environment node
 *
 * Appariement SÉMANTIQUE des compétences (GUIC-677).
 *
 * Le défaut corrigé : « Développement web » et « Programmation front-end » n'ont aucun
 * bigramme commun — le lexical ne les rapproche jamais, d'où PREPARE = 0 et une analyse
 * d'écart de compétences qui déclare « manquante » une compétence déjà acquise.
 *
 * Deux exigences non négociables sont testées ici : OPT-IN (sans variable d'env, rien ne
 * change) et FAIL-SOFT (endpoint HS → on retombe sur le lexical, jamais d'exception).
 */

const store = new Map<string, string>()
const mockMget = jest.fn(async (...keys: string[]) => keys.map(k => store.get(k) ?? null))
const mockSet = jest.fn(async (k: string, v: string) => { store.set(k, v); return 'OK' })
jest.mock('@/lib/redis', () => ({
  redis: { mget: (...a: string[]) => mockMget(...a), set: (...a: [string, string]) => mockSet(...a), get: jest.fn(), del: jest.fn() },
}))
jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

const mockEmbeddings = jest.fn()
jest.mock('@/lib/ia/llm-client', () => ({
  getLlmClient: () => ({ embeddings: { create: (...a: unknown[]) => mockEmbeddings(...a) } }),
}))

import { buildSkillIndex, type SkillRef } from '@/lib/ia/graph/skills-normalize'
import {
  cosine,
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
  mockEmbeddings.mockImplementation(async ({ input }: { input: string[] }) => ({
    data: input.map(t => ({ embedding: VECTORS[t] ?? [0, 0] })),
  }))
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

test('OPT-IN : sans YAYE_EMBEDDING_MODEL, aucun appel et comportement lexical strict', async () => {
  delete process.env.YAYE_EMBEDDING_MODEL
  expect(isEmbeddingEnabled()).toBe(false)

  const semantic = await prepareSemanticMatcher(SKILLS, ['Développement web'])
  expect(semantic).toBeNull()
  expect(mockEmbeddings).not.toHaveBeenCalled()
})

test('FAIL-SOFT : endpoint d’embedding en échec → matcher null, lexical préservé', async () => {
  mockEmbeddings.mockRejectedValue(new Error('embeddings not supported'))

  const semantic = await prepareSemanticMatcher(SKILLS, ['Développement web'])
  expect(semantic).toBeNull()
  expect(matchSkillsHybrid('Comptabilité', index, semantic).map(m => m.id)).toContain('sk-compta')
})

test('les vecteurs sont mis en cache : une seule vectorisation par texte', async () => {
  await prepareSemanticMatcher(SKILLS, ['Développement web'])
  const premierNombreAppels = mockEmbeddings.mock.calls.length
  expect(premierNombreAppels).toBeGreaterThan(0)
  expect(mockSet).toHaveBeenCalled()

  mockEmbeddings.mockClear()
  await prepareSemanticMatcher(SKILLS, ['Développement web'])
  expect(mockEmbeddings).not.toHaveBeenCalled() // tout vient du cache
})

test('CDP : seuls des libellés de compétences / thèmes sont envoyés au modèle', async () => {
  await prepareSemanticMatcher(SKILLS, ['Développement web'])
  const envoyes = mockEmbeddings.mock.calls.flatMap(c => (c[0] as { input: string[] }).input)

  // Le référentiel + le texte métier demandé, rien d'autre : aucun identifiant, aucun nom.
  expect(new Set(envoyes)).toEqual(new Set(['programmation front end', 'comptabilite', 'developpement web']))
})

test('l’hybride garde le meilleur score quand les deux voies trouvent la même compétence', async () => {
  const semantic = await prepareSemanticMatcher(SKILLS, ['Comptabilité'])
  const out = matchSkillsHybrid('Comptabilité', index, semantic)

  expect(out.filter(m => m.id === 'sk-compta')).toHaveLength(1) // dédupliqué
  expect(out[0].score).toBeCloseTo(1)
})
