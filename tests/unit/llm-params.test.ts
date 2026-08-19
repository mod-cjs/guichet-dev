/**
 * GUIC-537 (Phase 3 — paramètres LLM pilotables bornés) — température & max_tokens par slot,
 * réglables par l'admin MAIS bornés (garde-fou : jamais de valeur qui casse la prod). Module
 * PUR : clamp + défauts. La persistance/lecture DB est testée ailleurs.
 */
import {
  TEMP_MIN, TEMP_MAX, TOKENS_MIN, TOKENS_MAX,
  clampTemp, clampMaxTokens, resoudreParams, DEFAULTS_PAR_SLOT,
} from '@/lib/ia/llm-params'

describe('GUIC-537 — clampTemp', () => {
  it('borne dans [0,1]', () => {
    expect(clampTemp(1.5, 0.6)).toBe(TEMP_MAX)
    expect(clampTemp(-0.2, 0.6)).toBe(TEMP_MIN)
    expect(clampTemp(0.4, 0.6)).toBe(0.4)
  })
  it('valeur non finie / null → fallback', () => {
    expect(clampTemp(NaN, 0.6)).toBe(0.6)
    expect(clampTemp(null, 0.6)).toBe(0.6)
    expect(clampTemp(undefined, 0.6)).toBe(0.6)
  })
})

describe('GUIC-537 — clampMaxTokens', () => {
  it('borne dans [1, plafond] et arrondit à l’entier', () => {
    expect(clampMaxTokens(999999, 320)).toBe(TOKENS_MAX)
    expect(clampMaxTokens(0, 320)).toBe(TOKENS_MIN)
    expect(clampMaxTokens(500.7, 320)).toBe(500)
  })
  it('non fini / null → fallback', () => {
    expect(clampMaxTokens(NaN, 320)).toBe(320)
    expect(clampMaxTokens(null, 320)).toBe(320)
  })
})

describe('GUIC-537 — resoudreParams', () => {
  it('valeurs nulles → défauts du slot', () => {
    expect(resoudreParams('agent', { temperature: null, maxTokens: null })).toEqual(DEFAULTS_PAR_SLOT.agent)
    expect(resoudreParams('judge', {})).toEqual(DEFAULTS_PAR_SLOT.judge)
  })
  it('valeurs hors bornes → clampées', () => {
    const p = resoudreParams('agent', { temperature: 9, maxTokens: 999999 })
    expect(p.temperature).toBe(TEMP_MAX)
    expect(p.maxTokens).toBe(TOKENS_MAX)
  })
  it('valeurs valides → conservées', () => {
    expect(resoudreParams('adequation', { temperature: 0.3, maxTokens: 256 })).toEqual({ temperature: 0.3, maxTokens: 256 })
  })
  it('défauts métier cohérents (agent réponse chaleureuse, juge déterministe)', () => {
    expect(DEFAULTS_PAR_SLOT.agent.temperature).toBeGreaterThan(0)
    expect(DEFAULTS_PAR_SLOT.judge.temperature).toBe(0)
    expect(DEFAULTS_PAR_SLOT.adequation.temperature).toBe(0)
  })
})
