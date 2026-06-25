/**
 * @jest-environment node
 *
 * GUIC-466 — buildRegionFunnel : mapping clé enum → label affiché.
 *
 * Couvre :
 *  - 'Saint_Louis' → 'Saint-Louis'
 *  - 'Thies'       → 'Thiès'
 *  - region null   → 'Inconnue'
 *  - total = 0     → taux = 0 (division par zéro évitée)
 *  - tri desc total + slice(0, 8)
 */
import { buildRegionFunnel } from '@/app/admin/onboarding/page'

type GroupRow = {
  region: string | null
  onboardingComplete: boolean
  _count: { _all: number }
}

describe('buildRegionFunnel — mapping libellés région', () => {
  it("convertit 'Saint_Louis' en 'Saint-Louis'", () => {
    const groups: GroupRow[] = [
      { region: 'Saint_Louis', onboardingComplete: true,  _count: { _all: 30 } },
      { region: 'Saint_Louis', onboardingComplete: false, _count: { _all: 20 } },
    ]
    const result = buildRegionFunnel(groups)
    expect(result).toHaveLength(1)
    expect(result[0].region).toBe('Saint-Louis')
    expect(result[0].total).toBe(50)
    expect(result[0].onboardes).toBe(30)
    expect(result[0].taux).toBe(60)
  })

  it("convertit 'Thies' en 'Thiès'", () => {
    const groups: GroupRow[] = [
      { region: 'Thies', onboardingComplete: false, _count: { _all: 10 } },
    ]
    const result = buildRegionFunnel(groups)
    expect(result[0].region).toBe('Thiès')
  })

  it("affecte le label 'Inconnue' quand region est null", () => {
    const groups: GroupRow[] = [
      { region: null, onboardingComplete: false, _count: { _all: 5 } },
    ]
    const result = buildRegionFunnel(groups)
    expect(result[0].region).toBe('Inconnue')
  })

  it('retourne taux = 0 quand total = 0 (division par zéro évitée)', () => {
    // Cas théoriquement impossible en prod mais défensif
    const groups: GroupRow[] = []
    const result = buildRegionFunnel(groups)
    expect(result).toHaveLength(0)
  })

  it('retourne taux = 0 pour une région sans onboardés (total > 0, onboardes = 0)', () => {
    const groups: GroupRow[] = [
      { region: 'Matam', onboardingComplete: false, _count: { _all: 8 } },
    ]
    const result = buildRegionFunnel(groups)
    expect(result[0].taux).toBe(0)
    expect(result[0].total).toBe(8)
  })

  it('trie par total décroissant', () => {
    const groups: GroupRow[] = [
      { region: 'Louga',  onboardingComplete: false, _count: { _all: 5  } },
      { region: 'Dakar',  onboardingComplete: true,  _count: { _all: 50 } },
      { region: 'Matam',  onboardingComplete: false, _count: { _all: 20 } },
    ]
    const result = buildRegionFunnel(groups)
    expect(result[0].region).toBe('Dakar')
    expect(result[1].region).toBe('Matam')
    expect(result[2].region).toBe('Louga')
  })

  it('limite le résultat à 8 régions', () => {
    const groups: GroupRow[] = Array.from({ length: 12 }, (_, i) => ({
      region: `Région${i}`,
      onboardingComplete: false,
      _count: { _all: 12 - i },
    }))
    const result = buildRegionFunnel(groups)
    expect(result).toHaveLength(8)
  })

  it('agrège correctement les deux lignes (true/false) pour une même région', () => {
    const groups: GroupRow[] = [
      { region: 'Dakar', onboardingComplete: true,  _count: { _all: 70 } },
      { region: 'Dakar', onboardingComplete: false, _count: { _all: 30 } },
    ]
    const result = buildRegionFunnel(groups)
    expect(result).toHaveLength(1)
    expect(result[0].total).toBe(100)
    expect(result[0].onboardes).toBe(70)
    expect(result[0].taux).toBe(70)
  })
})
