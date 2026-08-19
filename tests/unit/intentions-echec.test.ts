/**
 * GUIC-435 (Phase 2 — boucle qualité) — synthèse « intentions en échec » : croiser
 * l'intention principale d'une session avec ses issues (résolu / escaladé / drapeau rouge /
 * YQS) pour faire ressortir les SUJETS qui échouent le plus = le backlog d'amélioration de
 * Yaye. Fonction PURE (l'agrégation DB est testée en intégration).
 */
import { synthetiserIntentions, type IntentionAgg } from '@/lib/ia/metrics/intentions-echec'

const agg = (o: Partial<IntentionAgg> & { intention: string; total: number }): IntentionAgg => ({
  resolus: 0, escalades: 0, drapeauxRouges: 0, yqsSum: 0, yqsCount: 0, ...o,
})

describe('GUIC-435 — synthetiserIntentions', () => {
  it('calcule les taux (résolu / escaladé / drapeau) et le YQS moyen', () => {
    const [r] = synthetiserIntentions([agg({ intention: 'emploi', total: 10, resolus: 7, escalades: 2, drapeauxRouges: 1, yqsSum: 700, yqsCount: 10 })])
    expect(r.tauxResolu).toBe(70)
    expect(r.tauxEscalade).toBe(20)
    expect(r.tauxDrapeauRouge).toBe(10)
    expect(r.yqsMoyen).toBe(70)
  })

  it('classe les intentions en échec en premier (moins résolues / plus escaladées / drapeaux)', () => {
    const rows = synthetiserIntentions([
      agg({ intention: 'saine', total: 20, resolus: 19, escalades: 0, drapeauxRouges: 0, yqsSum: 1800, yqsCount: 20 }),
      agg({ intention: 'échoue', total: 20, resolus: 4, escalades: 10, drapeauxRouges: 3, yqsSum: 600, yqsCount: 20 }),
    ])
    expect(rows[0].intention).toBe('échoue') // le pire d'abord
    expect(rows[1].intention).toBe('saine')
  })

  it('ignore les intentions à faible volume (< minVolume) — bruit statistique', () => {
    const rows = synthetiserIntentions(
      [agg({ intention: 'rare', total: 1, resolus: 0, escalades: 1 })],
      { minVolume: 5 },
    )
    expect(rows).toHaveLength(0)
  })

  it('YQS moyen null si aucune session scorée (pas de 0 fabriqué)', () => {
    const [r] = synthetiserIntentions([agg({ intention: 'x', total: 8, resolus: 4, yqsSum: 0, yqsCount: 0 })])
    expect(r.yqsMoyen).toBeNull()
  })

  it('exclut l’intention nulle (non catégorisée)', () => {
    const rows = synthetiserIntentions([agg({ intention: '', total: 10, resolus: 1 })])
    expect(rows).toHaveLength(0)
  })
})
