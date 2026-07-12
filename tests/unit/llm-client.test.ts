/**
 * @jest-environment node
 *
 * GUIC-537 — Client Vertex OpenAI-compatible : base URL dérivée de l'env, singleton,
 * timeout/retries passés au SDK, auth GCP injectée.
 */
const ctorCalls: Array<Record<string, unknown>> = []
jest.mock('openai', () => ({
  __esModule: true,
  default: class {
    constructor(opts: Record<string, unknown>) {
      ctorCalls.push(opts)
    }
  },
}))
jest.mock('google-auth-library', () => ({
  GoogleAuth: class {
    getAccessToken() {
      return Promise.resolve('tok-123')
    }
  },
}))

beforeEach(() => {
  ctorCalls.length = 0
  jest.resetModules()
  process.env.GOOGLE_CLOUD_PROJECT = 'cjs-prod'
  process.env.GOOGLE_CLOUD_LOCATION = 'europe-west1'
})

it('getVertexBaseUrl dérive project + location de l\'environnement', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getVertexBaseUrl } = require('@/lib/ia/llm-client')
  expect(getVertexBaseUrl()).toBe(
    'https://europe-west1-aiplatform.googleapis.com/v1/projects/cjs-prod/locations/europe-west1/endpoints/openapi',
  )
})

it('getVertexBaseUrl lève si le projet GCP est absent', () => {
  delete process.env.GOOGLE_CLOUD_PROJECT
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getVertexBaseUrl } = require('@/lib/ia/llm-client')
  expect(() => getVertexBaseUrl()).toThrow(/GOOGLE_CLOUD_PROJECT/)
})

it('construit le client avec baseURL Vertex + timeout + maxRetries, et le mémoïse', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { getLlmClient } = require('@/lib/ia/llm-client')
  const a = getLlmClient()
  const b = getLlmClient()

  expect(a).toBe(b)
  expect(ctorCalls).toHaveLength(1)
  expect(ctorCalls[0].baseURL).toContain('cjs-prod')
  expect(ctorCalls[0].baseURL).toContain('europe-west1')
  expect(typeof ctorCalls[0].timeout).toBe('number')
  expect(typeof ctorCalls[0].maxRetries).toBe('number')
  expect(typeof ctorCalls[0].fetch).toBe('function')
})

it('isLlmConfigured reflète la présence du projet GCP', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('@/lib/ia/llm-client')
  expect(mod.isLlmConfigured()).toBe(true)
  delete process.env.GOOGLE_CLOUD_PROJECT
  expect(mod.isLlmConfigured()).toBe(false)
})

describe('baseUrlForModel — routage MaaS partagé vs endpoint dédié', () => {
  it('Gemini / Llama MaaS → endpoint openapi partagé', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { baseUrlForModel } = require('@/lib/ia/llm-client')
    expect(baseUrlForModel('google/gemini-2.5-flash')).toMatch(/\/endpoints\/openapi$/)
    expect(baseUrlForModel('meta/llama-4-scout-17b-16e-instruct-maas')).toMatch(/\/endpoints\/openapi$/)
    expect(baseUrlForModel(undefined)).toMatch(/\/endpoints\/openapi$/)
  })

  it('modèle self-deployed (Gemma) sans endpoint dédié → lève', () => {
    delete process.env.VERTEX_DEDICATED_ENDPOINT_URL
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { baseUrlForModel } = require('@/lib/ia/llm-client')
    expect(() => baseUrlForModel('google/gemma-3-4b-it')).toThrow(/VERTEX_DEDICATED_ENDPOINT_URL/)
  })

  it('modèle self-deployed avec endpoint dédié → utilise cet endpoint', () => {
    process.env.VERTEX_DEDICATED_ENDPOINT_URL = 'https://ep.example/v1'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { baseUrlForModel } = require('@/lib/ia/llm-client')
    expect(baseUrlForModel('google/gemma-3-4b-it')).toBe('https://ep.example/v1')
    delete process.env.VERTEX_DEDICATED_ENDPOINT_URL
  })
})

describe('Fournisseur local LMStudio (LLM_PROVIDER=lmstudio)', () => {
  beforeEach(() => {
    process.env.LLM_PROVIDER = 'lmstudio'
    delete process.env.GOOGLE_CLOUD_PROJECT // aucune conf GCP requise en local
  })
  afterEach(() => {
    delete process.env.LLM_PROVIDER
    delete process.env.LMSTUDIO_BASE_URL
    delete process.env.LMSTUDIO_MODEL
  })

  it('isLocalProvider + isLlmConfigured vrais sans GCP', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require('@/lib/ia/llm-client')
    expect(m.isLocalProvider()).toBe(true)
    expect(m.isLlmConfigured()).toBe(true)
  })

  it('baseUrlForModel pointe sur LMStudio (défaut, puis surcharge)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    let m = require('@/lib/ia/llm-client')
    expect(m.baseUrlForModel()).toBe('http://localhost:1234/v1')
    jest.resetModules()
    process.env.LMSTUDIO_BASE_URL = 'http://127.0.0.1:4321/v1'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    m = require('@/lib/ia/llm-client')
    expect(m.baseUrlForModel()).toBe('http://127.0.0.1:4321/v1')
  })

  it('construit le client LMStudio sans auth GCP (pas de fetch maison)', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLlmClient } = require('@/lib/ia/llm-client')
    getLlmClient('local-model')
    expect(ctorCalls).toHaveLength(1)
    expect(ctorCalls[0].baseURL).toBe('http://localhost:1234/v1')
    expect(ctorCalls[0].apiKey).toBe('lm-studio')
    expect(ctorCalls[0].fetch).toBeUndefined() // pas d'injection de jeton GCP
  })

  it('localModel suit LMSTUDIO_MODEL', () => {
    process.env.LMSTUDIO_MODEL = 'qwen2.5-7b-instruct'
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { localModel } = require('@/lib/ia/llm-client')
    expect(localModel()).toBe('qwen2.5-7b-instruct')
  })
})
