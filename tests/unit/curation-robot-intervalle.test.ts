/**
 * GUIC-597 — US-2 : calcul de la prochaine vérification selon la fréquence.
 */
import { intervalleMs, prochaineVerif } from '@/lib/curation/robot/intervalle'

describe('GUIC-597 — intervalle par fréquence', () => {
  it('mappe chaque fréquence sur une durée', () => {
    expect(intervalleMs('horaire')).toBe(3600_000)
    expect(intervalleMs('six_heures')).toBe(6 * 3600_000)
    expect(intervalleMs('quotidienne')).toBe(24 * 3600_000)
    expect(intervalleMs('hebdomadaire')).toBe(7 * 24 * 3600_000)
  })

  it('prochaineVerif = base + intervalle (les 4 fréquences)', () => {
    const base = new Date('2026-07-20T10:00:00.000Z')
    expect(prochaineVerif('horaire', base).toISOString()).toBe('2026-07-20T11:00:00.000Z')
    expect(prochaineVerif('six_heures', base).toISOString()).toBe('2026-07-20T16:00:00.000Z')
    expect(prochaineVerif('quotidienne', base).toISOString()).toBe('2026-07-21T10:00:00.000Z')
    expect(prochaineVerif('hebdomadaire', base).toISOString()).toBe('2026-07-27T10:00:00.000Z')
  })
})
