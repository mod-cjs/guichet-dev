/**
 * GUIC-435 (Phase 3 — volet faisable hors-ligne) — health-check STATIQUE de la config LLM.
 * Valide la config admin courante sans aucun appel live : modèle dans l'allowlist Vertex,
 * capacités ↔ besoins du slot, et endpoint dédié provisionné pour un modèle self-deployed.
 * Fonction PURE ; l'agrégation (lecture DB/env) est testée en intégration. Zéro alerte
 * fabriquée : chaque alerte est adossée à un défaut de config réel.
 */
import { evaluerSlotConfig, deriverAlertesConfig } from '@/lib/ia/admin/config-sante'

describe('GUIC-435 — evaluerSlotConfig (statique)', () => {
  it('modèle recommandé sur le slot agent → sain, capacités OK, autorisé', () => {
    const s = evaluerSlotConfig('agent', 'google/gemini-2.5-flash', 'admin', false)
    expect(s.autorise).toBe(true)
    expect(s.capacitesOk).toBe(true)
    expect(s.capacitesManquantes).toEqual([])
    expect(s.endpointDedieRequis).toBe(false)
    expect(s.label).toBe('Gemini 2.5 Flash')
  })

  it('modèle hors allowlist → non autorisé, label null', () => {
    const s = evaluerSlotConfig('agent', 'openai/gpt-4o', 'env', false)
    expect(s.autorise).toBe(false)
    expect(s.label).toBeNull()
  })

  it('modèle self-deployed (Gemma) sans endpoint dédié → endpointDedieRequis', () => {
    const s = evaluerSlotConfig('agent', 'google/gemma-3-4b-it', 'admin', /* dedieConfigure */ false)
    expect(s.autorise).toBe(true)
    expect(s.endpointDedieRequis).toBe(true)
  })

  it('modèle self-deployed AVEC endpoint dédié configuré → plus de manque', () => {
    const s = evaluerSlotConfig('agent', 'google/gemma-3-4b-it', 'admin', /* dedieConfigure */ true)
    expect(s.endpointDedieRequis).toBe(false)
  })
})

describe('GUIC-435 — deriverAlertesConfig', () => {
  const sain = evaluerSlotConfig('agent', 'google/gemini-2.5-flash', 'admin', false)

  it('config saine → aucune alerte', () => {
    expect(deriverAlertesConfig([sain])).toEqual([])
  })

  it('modèle hors allowlist → alerte critique nommant le slot', () => {
    const hs = evaluerSlotConfig('judge', 'openai/gpt-4o', 'env', false)
    const a = deriverAlertesConfig([hs])
    expect(a.some((x) => x.niveau === 'critique' && /juge/i.test(x.message))).toBe(true)
  })

  it('endpoint dédié manquant → alerte warn (pas critique)', () => {
    const gs = evaluerSlotConfig('agent', 'google/gemma-3-4b-it', 'admin', false)
    const a = deriverAlertesConfig([gs])
    const dedie = a.find((x) => /dédié|endpoint/i.test(x.message))
    expect(dedie?.niveau).toBe('warn')
  })

  it('cumul → critique triée avant warn', () => {
    const hs = evaluerSlotConfig('judge', 'openai/gpt-4o', 'env', false)
    const gs = evaluerSlotConfig('agent', 'google/gemma-3-4b-it', 'admin', false)
    const a = deriverAlertesConfig([hs, gs])
    expect(a[0].niveau).toBe('critique')
    expect(a.length).toBeGreaterThanOrEqual(2)
  })
})
