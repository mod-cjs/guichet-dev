/**
 * @jest-environment node
 *
 * Tests de calibration du juge (GUIC-435, Phase 1, R2 & R3). Fonctions pures.
 */

import { cohenKappa, binScore, agreementByDimension, rubricDrift, type DimScores } from '@/lib/ia/metrics/calibration'

const dim = (fidelite: number, rest = 1): DimScores => ({
  fidelite,
  pertinence: rest,
  utilite: rest,
  persona: rest,
  conformiteCdp: rest,
  langue: rest,
})

test('binScore : 3 classes', () => {
  expect(binScore(0.2)).toBe(0)
  expect(binScore(0.5)).toBe(1)
  expect(binScore(0.9)).toBe(2)
})

test('cohenKappa : accord parfait = 1, désaccord total = négatif/0', () => {
  expect(cohenKappa([0, 1, 2, 1], [0, 1, 2, 1])).toBe(1)
  expect(cohenKappa([0, 0, 0], [0, 0, 0])).toBe(1) // tout identique
  expect(cohenKappa([0, 1], [1, 0])).toBeLessThanOrEqual(0)
})

test('R2 agreementByDimension : repère les dimensions où juge et humain divergent', () => {
  const human = [dim(0.9), dim(0.9), dim(0.2), dim(0.2)]
  const judge = [dim(0.2), dim(0.2), dim(0.9), dim(0.9)] // fidélité inversée
  const r = agreementByDimension(human, judge)
  expect(r.parDimension.fidelite).toBeLessThanOrEqual(0) // désaccord sur la fidélité
  expect(r.faibles).toContain('fidelite')
  expect(r.parDimension.pertinence).toBe(1) // accord parfait ailleurs
})

test('R3 rubricDrift : détecte un déplacement de la note moyenne entre versions', () => {
  const v1 = [dim(0.5), dim(0.5)] // fidélité moyenne 0.5
  const v2 = [dim(0.9), dim(0.9)] // fidélité moyenne 0.9 → +0.4
  const r = rubricDrift(v1, v2)
  expect(r.parDimension.fidelite).toBeCloseTo(0.4, 2)
  expect(r.derives).toContain('fidelite')
  expect(r.derives).not.toContain('pertinence') // stable
})
