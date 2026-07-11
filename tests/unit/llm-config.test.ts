/**
 * @jest-environment node
 *
 * GUIC-537 — Résolution du modèle par slot : cache Redis → base → env → défaut,
 * + écriture validée avec invalidation du cache.
 */
const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()
const mockRedisDel = jest.fn()
const mockFindUnique = jest.fn()
const mockUpsert = jest.fn()

jest.mock('@/lib/redis', () => ({
  redis: {
    get: (...a: unknown[]) => mockRedisGet(...a),
    set: (...a: unknown[]) => mockRedisSet(...a),
    del: (...a: unknown[]) => mockRedisDel(...a),
  },
}))
jest.mock('@/lib/prisma', () => ({
  prisma: {
    llmConfig: {
      findUnique: (...a: unknown[]) => mockFindUnique(...a),
      upsert: (...a: unknown[]) => mockUpsert(...a),
    },
  },
}))
jest.mock('@/lib/logger', () => ({ logger: { warn: jest.fn(), info: jest.fn(), error: jest.fn() } }))

import { getLlmConfig, getSlotModel, setLlmConfig } from '@/lib/ia/llm-config'
import { DEFAULT_MODEL } from '@/lib/ia/supported-models'

beforeEach(() => {
  jest.clearAllMocks()
  mockRedisGet.mockResolvedValue(null)
  mockRedisSet.mockResolvedValue('OK')
  mockRedisDel.mockResolvedValue(1)
  delete process.env.YAYE_MODEL
  delete process.env.YAYE_JUDGE_MODEL
  delete process.env.ADEQUATION_MODEL
  delete process.env.GROQ_MODEL
})

describe('GUIC-537 — getLlmConfig', () => {
  it('base vide + pas d\'env → défaut pour les 3 slots', async () => {
    mockFindUnique.mockResolvedValue(null)
    const cfg = await getLlmConfig()
    expect(cfg).toEqual({ agent: DEFAULT_MODEL, judge: DEFAULT_MODEL, adequation: DEFAULT_MODEL })
  })

  it('base vide + env défini → utilise l\'env', async () => {
    mockFindUnique.mockResolvedValue(null)
    process.env.YAYE_MODEL = 'meta/llama-3.3-70b-instruct-maas'
    process.env.ADEQUATION_MODEL = 'google/gemini-2.5-pro'
    const cfg = await getLlmConfig()
    expect(cfg.agent).toBe('meta/llama-3.3-70b-instruct-maas')
    expect(cfg.adequation).toBe('google/gemini-2.5-pro')
    expect(cfg.judge).toBe(DEFAULT_MODEL)
  })

  it('ligne en base → prioritaire sur l\'env', async () => {
    process.env.YAYE_MODEL = 'meta/llama-3.3-70b-instruct-maas'
    mockFindUnique.mockResolvedValue({
      agentModel: 'google/gemini-2.5-pro',
      judgeModel: 'google/gemini-2.5-flash',
      adequationModel: 'google/gemini-2.5-flash',
    })
    const cfg = await getLlmConfig()
    expect(cfg.agent).toBe('google/gemini-2.5-pro')
  })

  it('cache hit → ne touche pas la base', async () => {
    mockRedisGet.mockResolvedValue(JSON.stringify({ agent: 'x', judge: 'y', adequation: 'z' }))
    const cfg = await getLlmConfig()
    expect(cfg.agent).toBe('x')
    expect(mockFindUnique).not.toHaveBeenCalled()
  })

  it('erreur base → fallback env (fail-soft)', async () => {
    mockFindUnique.mockRejectedValue(new Error('db down'))
    const cfg = await getLlmConfig()
    expect(cfg.agent).toBe(DEFAULT_MODEL)
  })
})

describe('GUIC-537 — getSlotModel', () => {
  it('renvoie le modèle du slot', async () => {
    mockFindUnique.mockResolvedValue(null)
    expect(await getSlotModel('judge')).toBe(DEFAULT_MODEL)
  })
})

describe('GUIC-537 — setLlmConfig', () => {
  it('modèle hors allowlist → rejette et n\'écrit pas', async () => {
    await expect(setLlmConfig({ agent: 'gpt-4o' })).rejects.toThrow()
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('modèle valide → upsert + invalidation cache', async () => {
    mockFindUnique.mockResolvedValue(null)
    const next = await setLlmConfig({ agent: 'google/gemini-2.5-pro' }, 'admin-uid')
    expect(next.agent).toBe('google/gemini-2.5-pro')
    expect(mockUpsert).toHaveBeenCalledTimes(1)
    expect(mockRedisDel).toHaveBeenCalledWith('llm:config')
  })
})
