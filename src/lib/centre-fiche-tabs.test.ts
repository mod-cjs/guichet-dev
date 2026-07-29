import { CENTRE_TABS, parseTab, type CentreTab } from './centre-fiche-tabs'

describe('centre-fiche-tabs — onglets de la fiche Centre (Phase A)', () => {
  it('expose les onglets Phase A dans l\'ordre', () => {
    expect(CENTRE_TABS.map((t) => t.value)).toEqual<CentreTab[]>(['vue', 'ressources', 'frequentation'])
  })

  it('chaque onglet a un label + une icône', () => {
    for (const t of CENTRE_TABS) {
      expect(t.label).toBeTruthy()
      expect(t.icon).toBeTruthy()
    }
  })

  it('parseTab : défaut = vue d\'ensemble', () => {
    expect(parseTab(undefined)).toBe('vue')
    expect(parseTab('')).toBe('vue')
  })

  it('parseTab : lit un onglet valide', () => {
    expect(parseTab('ressources')).toBe('ressources')
    expect(parseTab('frequentation')).toBe('frequentation')
  })

  it('parseTab : normalise un onglet inconnu (ou d\'une phase future) vers vue', () => {
    expect(parseTab('equipe')).toBe('vue')
    expect(parseTab('xyz')).toBe('vue')
  })
})
