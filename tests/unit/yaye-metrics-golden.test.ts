/**
 * @jest-environment node
 *
 * Tests du golden set + régression Yaye (GUIC-435, jalon E).
 * Fonctions pures, déterministes (pas de Groq).
 */

import { evaluateIntentPrecision, runGoldenSet } from '@/lib/ia/metrics/golden/harness'
import type { GoldenScenario } from '@/lib/ia/metrics/golden/scenarios'
import { detectRegression } from '@/lib/ia/metrics/regression'

const GOLD: GoldenScenario[] = [
  { id: 'salut', message: 'Bonjour', expectedTool: null },
  { id: 'offre', message: 'Trouve un emploi', expectedTool: 'search_opportunities' },
]

test('precision parfaite quand le 1er outil correspond (et null = réponse directe)', () => {
  const r = evaluateIntentPrecision(
    [
      { id: 'salut', toolsUsed: [] },
      { id: 'offre', toolsUsed: ['search_opportunities'] },
    ],
    GOLD,
  )
  expect(r.precision).toBe(1)
  expect(r.misses).toHaveLength(0)
})

test('mauvais outil compté en miss', () => {
  const r = evaluateIntentPrecision(
    [
      { id: 'salut', toolsUsed: ['get_badge'] }, // attendu null
      { id: 'offre', toolsUsed: ['search_opportunities'] },
    ],
    GOLD,
  )
  expect(r.corrects).toBe(1)
  expect(r.precision).toBe(0.5)
  expect(r.misses[0]).toMatchObject({ id: 'salut', attendu: null, obtenu: 'get_badge' })
})

test('runGoldenSet via runner injecté (fail-soft si le runner throw)', async () => {
  const runner = async (message: string) =>
    message.includes('emploi') ? ['search_opportunities'] : []
  const r = await runGoldenSet(runner, GOLD)
  expect(r.precision).toBe(1)
})

test('detectRegression : chute de YQS au-delà du seuil → régression', () => {
  const r = detectRegression(
    { yqs: 70, fidelite: 0.8, conformiteCdp: 0.9, intentPrecision: 0.9 },
    { yqs: 80, fidelite: 0.8, conformiteCdp: 0.9, intentPrecision: 0.9 },
  )
  expect(r.regressed).toBe(true)
  expect(r.raisons[0]).toMatch(/YQS/)
  expect(r.deltas.yqs).toBe(-10)
})

test('detectRegression : baisse de fidélité critique détectée', () => {
  const r = detectRegression(
    { yqs: 79, fidelite: 0.6, conformiteCdp: 0.9, intentPrecision: 0.9 },
    { yqs: 80, fidelite: 0.8, conformiteCdp: 0.9, intentPrecision: 0.9 },
  )
  expect(r.regressed).toBe(true)
  expect(r.raisons.some((x) => /Fidélité/.test(x))).toBe(true)
})

test('detectRegression : stable → pas de régression', () => {
  const r = detectRegression(
    { yqs: 81, fidelite: 0.82, conformiteCdp: 0.9, intentPrecision: 0.92 },
    { yqs: 80, fidelite: 0.8, conformiteCdp: 0.9, intentPrecision: 0.9 },
  )
  expect(r.regressed).toBe(false)
  expect(r.raisons).toHaveLength(0)
})
