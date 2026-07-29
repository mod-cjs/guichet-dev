import { buildFunnel, ratePct, avgSatisfaction, type FunnelInput } from './dashboard-admin'

describe('dashboard-admin — agrégats purs (task-first / funnel héros)', () => {
  describe('buildFunnel', () => {
    const input: FunnelInput[] = [
      { key: 'recue', label: 'Reçues', count: 200 },
      { key: 'preselection', label: 'Présélection', count: 144 },
      { key: 'entretien', label: 'Entretien', count: 100 },
      { key: 'retenue', label: 'Retenues', count: 56 },
      { key: 'insertion', label: 'Insertion', count: 22 },
    ]

    it('calcule le % du sommet et la conversion étape→étape', () => {
      const f = buildFunnel(input)
      expect(f[0].pctOfTop).toBe(1) // Reçues = 100 %
      expect(f[0].conversion).toBeNull() // pas de conversion sur la 1re
      expect(f[1].conversion).toBeCloseTo(144 / 200) // 72 %
      expect(f[2].conversion).toBeCloseTo(100 / 144)
      expect(f[4].pctOfTop).toBeCloseTo(22 / 200)
    })

    it('surligne le POINT DE FUITE (plus grosse perte de conversion)', () => {
      const f = buildFunnel(input)
      // pertes : 28% (presel), 30.5% (entretien), 44% (retenue), 60.7% (insertion)
      // la plus grosse est insertion (dernier), mais on veut le vrai goulot métier :
      const dropoff = f.find((s) => s.dropoff)
      expect(dropoff?.key).toBe('insertion')
      expect(f.filter((s) => s.dropoff).length).toBe(1)
    })

    it('gère un sommet à 0 sans diviser par zéro', () => {
      const f = buildFunnel([{ key: 'a', label: 'A', count: 0 }, { key: 'b', label: 'B', count: 0 }])
      expect(f[0].pctOfTop).toBe(0)
      expect(f[1].conversion).toBe(0)
    })
  })

  describe('ratePct', () => {
    it('taux en % arrondi, 0 si dénominateur nul', () => {
      expect(ratePct(39, 48)).toBe(81) // auto-résolution
      expect(ratePct(0, 0)).toBe(0)
      expect(ratePct(5, 10)).toBe(50)
    })
  })

  describe('avgSatisfaction', () => {
    it('satisfaction = part de 👍 en %, null si aucun feedback', () => {
      expect(avgSatisfaction([{ note: 1 }, { note: 1 }, { note: -1 }])).toBe(67)
      expect(avgSatisfaction([])).toBeNull()
    })
  })
})
