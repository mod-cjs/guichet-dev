/**
 * P1-E — calibration du juge LLM contre un gold humain.
 * Prouve que l'instrument juge est validé AVANT qu'on s'y fie : un juge anti-corrélé est
 * marqué NON fiable ; un juge décalé mais corrélé (classement conservé) reste fiable.
 */
import { agreementRate, cohenKappa, pearson, calibrateJudge, type RatingPair } from '@/lib/ia/metrics/golden/judge-calibration'

const pair = (judge: number, human: number): RatingPair => ({ judge, human })

describe('calibration du juge', () => {
  test('juge PARFAIT (accord total, variance présente) → fiable', () => {
    const pairs = [pair(5, 5), pair(3, 3), pair(4, 4), pair(2, 2), pair(1, 1)]
    expect(agreementRate(pairs)).toBe(1)
    expect(cohenKappa(pairs)).toBe(1)
    expect(pearson(pairs)).toBe(1)
    expect(calibrateJudge(pairs).reliable).toBe(true)
  })

  test('juge ANTI-CORRÉLÉ → non fiable (kappa bas ET corrélation négative)', () => {
    const pairs = [pair(5, 1), pair(4, 2), pair(3, 3), pair(2, 4), pair(1, 5)]
    const c = calibrateJudge(pairs)
    expect(c.correlation).toBeLessThan(0)
    expect(c.reliable).toBe(false)
  })

  test('juge DÉCALÉ mais corrélé (juge = humain + 1) → fiable via la corrélation', () => {
    const pairs = [pair(2, 1), pair(3, 2), pair(4, 3), pair(5, 4)]
    expect(agreementRate(pairs)).toBe(0) // aucun accord EXACT…
    expect(pearson(pairs)).toBeCloseTo(1, 5) // …mais classement parfaitement conservé
    expect(calibrateJudge(pairs).reliable).toBe(true)
  })

  test('juge BRUITÉ sous le seuil → non fiable', () => {
    const pairs = [pair(5, 1), pair(1, 5), pair(3, 2), pair(2, 4), pair(4, 3)]
    expect(calibrateJudge(pairs, { kappaMin: 0.6, corrMin: 0.7 }).reliable).toBe(false)
  })

  test('gold vide → non fiable (rien à calibrer)', () => {
    expect(calibrateJudge([]).reliable).toBe(false)
  })
})
