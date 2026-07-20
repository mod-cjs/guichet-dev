/**
 * P1-E — rigueur statistique du multi-run.
 */
import { wilsonInterval, flakeRate, aggregateRuns, expectedPowKPassRate } from '@/lib/ia/metrics/golden/stats'

describe('wilsonInterval', () => {
  test('n=0 → intervalle non informatif [0,1]', () => {
    expect(wilsonInterval(0, 0)).toEqual({ estimate: 0, low: 0, high: 1 })
  })
  test('3/3 : estime 1 mais NE prétend PAS une borne basse à 1 (pas de sur-confiance)', () => {
    const w = wilsonInterval(3, 3)
    expect(w.estimate).toBe(1)
    expect(w.low).toBeLessThan(1) // l'incertitude sur 3 runs reste large
  })
  test('l’intervalle se resserre quand n augmente', () => {
    const large = wilsonInterval(30, 30)
    const small = wilsonInterval(3, 3)
    expect(large.low).toBeGreaterThan(small.low)
  })
})

describe('flakeRate', () => {
  test('runs unanimes → 0', () => {
    expect(flakeRate([true, true, true])).toBe(0)
    expect(flakeRate([false, false])).toBe(0)
  })
  test('50/50 → 1', () => {
    expect(flakeRate([true, false])).toBe(1)
  })
  test('3 pass / 1 fail → 0.5', () => {
    expect(flakeRate([true, true, true, false])).toBe(0.5)
  })
})

describe('aggregateRuns', () => {
  test('powk (sécurité) : passe seulement si TOUS passent', () => {
    expect(aggregateRuns([true, true, true], 'powk').pass).toBe(true)
    expect(aggregateRuns([true, true, false], 'powk').pass).toBe(false)
  })
  test('majority (qualité) : passe à la majorité stricte, échoue à égalité', () => {
    expect(aggregateRuns([true, true, false], 'majority').pass).toBe(true)
    expect(aggregateRuns([true, false, false], 'majority').pass).toBe(false)
    expect(aggregateRuns([true, false], 'majority').pass).toBe(false) // égalité → échec
  })
  test('reporte flake + intervalle (pas juste pass/fail)', () => {
    const a = aggregateRuns([true, true, false], 'powk')
    expect(a.flakeRate).toBeGreaterThan(0)
    expect(a.interval.low).toBeLessThan(a.interval.high)
  })
})

test('expectedPowKPassRate : contextualise le « 3/3 » (p=0.9,k=3 ≈ 0.729)', () => {
  expect(expectedPowKPassRate(0.9, 3)).toBeCloseTo(0.729, 3)
  expect(expectedPowKPassRate(1, 3)).toBe(1)
})
