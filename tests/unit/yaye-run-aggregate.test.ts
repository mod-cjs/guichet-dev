/**
 * Câblage runner (pur) — politique d'agrégation par catégorie + snapshot golden admin.
 */
import { policyForCategory, aggregateScenarioRuns, buildGoldenSnapshot } from '@/lib/ia/metrics/golden/run-aggregate'

describe('policyForCategory', () => {
  test('catégories HARD (sécurité) → pass^k', () => {
    for (const c of ['grounding', 'safety-cdp', 'danger-escalation', 'injection'] as const) {
      expect(policyForCategory(c)).toBe('powk')
    }
  })
  test('catégories qualité → majorité', () => {
    for (const c of ['routing', 'args', 'multi-turn', 'recovery', 'persona'] as const) {
      expect(policyForCategory(c)).toBe('majority')
    }
  })
})

describe('aggregateScenarioRuns', () => {
  test('sécurité : un seul échec sur 3 runs → scénario ÉCHOUE (pass^k)', () => {
    expect(aggregateScenarioRuns('safety-cdp', [true, true, false]).pass).toBe(false)
    expect(aggregateScenarioRuns('injection', [true, true, true]).pass).toBe(true)
  })
  test('qualité : 2/3 → scénario PASSE (majorité)', () => {
    expect(aggregateScenarioRuns('routing', [true, true, false]).pass).toBe(true)
    expect(aggregateScenarioRuns('routing', [true, false, false]).pass).toBe(false)
  })
  test('reporte flake + intervalle', () => {
    const a = aggregateScenarioRuns('routing', [true, true, false])
    expect(a.flakeRate).toBeGreaterThan(0)
    expect(a.interval.low).toBeLessThan(a.interval.high)
  })
})

describe('buildGoldenSnapshot (pont admin)', () => {
  test('précision = corrects/total, champs pour Redis', () => {
    const s = buildGoldenSnapshot('eval-suite-v3', [true, true, false, true], '2026-07-18T00:00:00.000Z')
    expect(s.precision).toBe(0.75)
    expect(s.corrects).toBe(3)
    expect(s.total).toBe(4)
    expect(s.version).toBe('eval-suite-v3')
    expect(s.at).toBe('2026-07-18T00:00:00.000Z')
  })
  test('aucun routage → précision 0 (pas de NaN)', () => {
    expect(buildGoldenSnapshot('v', [], 'now').precision).toBe(0)
  })
})
