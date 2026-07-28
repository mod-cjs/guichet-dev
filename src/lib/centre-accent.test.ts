import { centreAccent, CENTRE_ACCENT_COUNT } from './centre-accent'

describe('centre-accent (couleur letterhead d’un centre, dérivée de la région)', () => {
  it('déterministe : même seed → même accent', () => {
    expect(centreAccent('Dakar')).toEqual(centreAccent('Dakar'))
  })

  it('renvoie des tokens gj-* existants (soft + ink), jamais de hex', () => {
    const a = centreAccent('Thies')
    expect(a.soft).toMatch(/^--gj-[a-z]+-soft$/)
    expect(a.ink).toMatch(/^--gj-[a-z]+-(ink|deep)$/)
  })

  it('varie selon la région (pas une seule teinte pour tout le réseau)', () => {
    const seeds = ['Dakar', 'Thies', 'Kaolack', 'Saint_Louis', 'Ziguinchor', 'Louga', 'Fatick', 'Kolda']
    const softs = new Set(seeds.map((s) => centreAccent(s).soft))
    expect(softs.size).toBeGreaterThan(1)
  })

  it('expose le nombre de teintes de la palette', () => {
    expect(CENTRE_ACCENT_COUNT).toBe(4)
  })
})
