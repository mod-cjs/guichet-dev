/**
 * @jest-environment node
 *
 * GUIC-520 — Funnel de recrutement (fonction pure), inclut les refusées.
 */
import { buildFunnel } from '@/lib/recruteur/funnel'

describe('GUIC-520 — buildFunnel', () => {
  it('ordonne les 5 segments et inclut les refusées', () => {
    const f = buildFunnel({ recue: 59, preselection: 65, entretien: 1, retenue: 40, refusee: 83 })
    expect(f.segments.map((s) => s.id)).toEqual(['recue', 'presel', 'entretien', 'retenue', 'refusee'])
    expect(f.segments.find((s) => s.id === 'refusee')?.count).toBe(83)
    expect(f.total).toBe(59 + 65 + 1 + 40 + 83)
  })

  it('calcule les pourcentages arrondis sur le total du funnel', () => {
    const f = buildFunnel({ recue: 50, preselection: 25, entretien: 0, retenue: 0, refusee: 25 })
    const pct = Object.fromEntries(f.segments.map((s) => [s.id, s.pct]))
    expect(pct.recue).toBe(50)
    expect(pct.presel).toBe(25)
    expect(pct.refusee).toBe(25)
  })

  it('total nul → tous les segments à 0 % (pas de division par zéro)', () => {
    const f = buildFunnel({ recue: 0, preselection: 0, entretien: 0, retenue: 0, refusee: 0 })
    expect(f.total).toBe(0)
    expect(f.segments.every((s) => s.pct === 0 && s.count === 0)).toBe(true)
  })

  it('ignore les valeurs négatives ou non finies', () => {
    const f = buildFunnel({ recue: -3, preselection: NaN as unknown as number, entretien: 2, retenue: 0, refusee: 0 })
    expect(f.total).toBe(2)
    expect(f.segments.find((s) => s.id === 'recue')?.count).toBe(0)
    expect(f.segments.find((s) => s.id === 'entretien')?.count).toBe(2)
  })
})
