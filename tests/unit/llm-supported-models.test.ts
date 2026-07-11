/**
 * @jest-environment node
 *
 * GUIC-537 — Allowlist des modèles Vertex + validation par slot + sanitisation params.
 * Module PUR : aucune I/O, aucun mock nécessaire.
 */
import {
  SUPPORTED_MODELS,
  DEFAULT_MODEL,
  getModelMeta,
  isSupportedModel,
  assertSlotModel,
  slotRequirements,
  sanitizeParamsForModel,
} from '@/lib/ia/supported-models'

describe('GUIC-537 — allowlist', () => {
  it('n\'est pas vide et ne contient que des modèles Vertex', () => {
    expect(SUPPORTED_MODELS.length).toBeGreaterThan(0)
    expect(SUPPORTED_MODELS.every(m => m.provider === 'vertex')).toBe(true)
  })

  it('le modèle par défaut fait partie de l\'allowlist', () => {
    expect(isSupportedModel(DEFAULT_MODEL)).toBe(true)
  })

  it('getModelMeta / isSupportedModel', () => {
    expect(getModelMeta(DEFAULT_MODEL)?.id).toBe(DEFAULT_MODEL)
    expect(getModelMeta('inexistant')).toBeUndefined()
    expect(isSupportedModel('inexistant')).toBe(false)
  })
})

describe('GUIC-537 — assertSlotModel', () => {
  it('accepte un modèle valide pour son slot', () => {
    expect(() => assertSlotModel('agent', DEFAULT_MODEL)).not.toThrow()
    expect(() => assertSlotModel('judge', DEFAULT_MODEL)).not.toThrow()
    expect(() => assertSlotModel('adequation', DEFAULT_MODEL)).not.toThrow()
  })

  it('rejette un modèle hors allowlist', () => {
    expect(() => assertSlotModel('agent', 'gpt-4o')).toThrow(/hors allowlist|non autorisé/i)
  })

  it('le slot agent exige tools + streaming', () => {
    expect(slotRequirements('agent')).toMatchObject({ tools: true, stream: true })
  })
})

describe('GUIC-537 — sanitizeParamsForModel', () => {
  const params = { temperature: 0.5, frequency_penalty: 0.2, presence_penalty: 0.1, top_p: 0.9 }

  it('retire les penalties pour un modèle Gemini (non supportées en compat)', () => {
    const out = sanitizeParamsForModel('google/gemini-2.5-flash', params)
    expect(out).not.toHaveProperty('frequency_penalty')
    expect(out).not.toHaveProperty('presence_penalty')
    expect(out.temperature).toBe(0.5)
    expect(out.top_p).toBe(0.9)
  })

  it('conserve les penalties pour un modèle Llama', () => {
    const out = sanitizeParamsForModel('meta/llama-3.3-70b-instruct-maas', params)
    expect(out).toMatchObject({ frequency_penalty: 0.2, presence_penalty: 0.1 })
  })

  it('n\'altère jamais l\'objet d\'entrée', () => {
    sanitizeParamsForModel('google/gemini-2.5-flash', params)
    expect(params).toHaveProperty('frequency_penalty', 0.2)
  })
})
