import { centreRgb, CENTRE_ACCENT_COUNT } from './centre-accent'

describe('centre-accent (couleur letterhead par région — palette maquette)', () => {
  it('déterministe : même seed → même couleur', () => {
    expect(centreRgb('Dakar')).toBe(centreRgb('Dakar'))
  })

  it('renvoie un triplet RGB de la palette maquette', () => {
    const c = centreRgb('Thies')
    expect(c).toMatch(/^\d{1,3},\d{1,3},\d{1,3}$/)
  })

  it('varie selon la région (pas une seule teinte)', () => {
    const seeds = ['Dakar', 'Thies', 'Kaolack', 'Saint_Louis', 'Ziguinchor', 'Diourbel']
    expect(new Set(seeds.map(centreRgb)).size).toBeGreaterThan(1)
  })

  it('expose la taille de la palette (6 teintes)', () => {
    expect(CENTRE_ACCENT_COUNT).toBe(6)
  })
})
