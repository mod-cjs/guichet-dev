/**
 * @jest-environment node
 *
 * Transport des embeddings sur Vertex AI (GUIC-677) — API NATIVE `:predict`.
 *
 * Ce fichier teste ce que le module d'appariement ne peut pas voir : l'URL du modèle
 * publisher, le type de tâche, la réduction de dimensions (empreinte Redis) et la
 * CONTRAINTE de lot propre à `gemini-embedding-001` (une seule instance par requête —
 * la rater ferait échouer la première projection en masse).
 */

jest.mock('@/lib/logger', () => ({ logger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() } }))

const mockToken = jest.fn(async () => 'jeton-gcp')
jest.mock('@/lib/ia/llm-client', () => ({
  getGcpAccessToken: () => mockToken(),
  vertexProjectLocation: () => ({ project: 'cjs-projet', location: 'europe-west1' }),
}))

import { embedWithVertex, vertexBatchSize, EMBEDDING_DIMENSIONS } from '@/lib/ia/vertex-embeddings'

const mockFetch = jest.fn()
global.fetch = mockFetch as unknown as typeof fetch

/** Réponse `:predict` conforme au contrat Vertex. */
const reponse = (vecteurs: number[][]) => ({
  ok: true,
  status: 200,
  json: async () => ({ predictions: vecteurs.map(values => ({ embeddings: { values } })) }),
  text: async () => '',
})

beforeEach(() => {
  jest.clearAllMocks()
  mockToken.mockResolvedValue('jeton-gcp')
})

test('appelle le modèle publisher du projet, avec le jeton GCP', async () => {
  mockFetch.mockResolvedValueOnce(reponse([[0.1, 0.2]]))

  const out = await embedWithVertex('gemini-embedding-001', ['comptabilite'])

  expect(out).toEqual([[0.1, 0.2]])
  const [url, init] = mockFetch.mock.calls[0]
  expect(url).toBe(
    'https://europe-west1-aiplatform.googleapis.com/v1/projects/cjs-projet' +
      '/locations/europe-west1/publishers/google/models/gemini-embedding-001:predict',
  )
  expect((init.headers as Record<string, string>).authorization).toBe('Bearer jeton-gcp')
})

test('déclare SEMANTIC_SIMILARITY et réduit les dimensions (empreinte Redis)', async () => {
  mockFetch.mockResolvedValueOnce(reponse([[0.1]]))
  await embedWithVertex('gemini-embedding-001', ['excel'])

  const body = JSON.parse(mockFetch.mock.calls[0][1].body as string)
  // Comparaison libellé ↔ libellé : tâche SYMÉTRIQUE (pas RETRIEVAL_*).
  expect(body.instances).toEqual([{ content: 'excel', task_type: 'SEMANTIC_SIMILARITY' }])
  expect(body.parameters.outputDimensionality).toBe(EMBEDDING_DIMENSIONS)
  expect(EMBEDDING_DIMENSIONS).toBeLessThan(3072) // sinon ~12 Ko/vecteur sur un Redis mutualisé
})

test('contrainte de lot : gemini-embedding = 1 instance, modèles text-* = lots réels', () => {
  expect(vertexBatchSize('gemini-embedding-001')).toBe(1)
  expect(vertexBatchSize('text-multilingual-embedding-002')).toBeGreaterThan(1)
})

test('projet non configuré → null (repli lexical), aucun appel réseau', async () => {
  jest.resetModules()
  jest.doMock('@/lib/ia/llm-client', () => ({
    getGcpAccessToken: () => mockToken(),
    vertexProjectLocation: () => ({ project: null, location: 'us-central1' }),
  }))
  const { embedWithVertex: sansProjet } = await import('@/lib/ia/vertex-embeddings')

  expect(await sansProjet('gemini-embedding-001', ['x'])).toBeNull()
  expect(mockFetch).not.toHaveBeenCalled()
  jest.dontMock('@/lib/ia/llm-client')
})

test('réponse en erreur (403 API désactivée, quota…) → null, jamais d’exception', async () => {
  mockFetch.mockResolvedValueOnce({ ok: false, status: 403, text: async () => 'API not enabled', json: async () => ({}) })
  await expect(embedWithVertex('gemini-embedding-001', ['x'])).resolves.toBeNull()
})

test('réseau en échec → null', async () => {
  mockFetch.mockRejectedValueOnce(new Error('ECONNRESET'))
  await expect(embedWithVertex('gemini-embedding-001', ['x'])).resolves.toBeNull()
})

test('réponse PARTIELLE → null (un décalage texte ↔ vecteur corromprait l’appariement)', async () => {
  mockFetch.mockResolvedValueOnce(reponse([[0.1, 0.2]])) // 1 vecteur pour 2 textes
  await expect(embedWithVertex('gemini-embedding-001', ['a', 'b'])).resolves.toBeNull()

  mockFetch.mockResolvedValueOnce(reponse([[0.1], []])) // un vecteur vide
  await expect(embedWithVertex('gemini-embedding-001', ['a', 'b'])).resolves.toBeNull()
})

test('lot vide → [] sans appel', async () => {
  expect(await embedWithVertex('gemini-embedding-001', [])).toEqual([])
  expect(mockFetch).not.toHaveBeenCalled()
})
