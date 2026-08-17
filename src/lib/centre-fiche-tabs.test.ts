import { CENTRE_TABS, parseTab, type CentreTab } from './centre-fiche-tabs'

describe('centre-fiche-tabs — onglets de la fiche Centre (Phase A)', () => {
  it('expose les onglets dans l\'ordre maquette', () => {
    // GUIC-687 — onglets Équipe / Bibliothèque / Événements ajoutés après la Phase A.
    expect(CENTRE_TABS.map((t) => t.value)).toEqual<CentreTab[]>(['vue', 'equipe', 'ressources', 'frequentation', 'biblio', 'evenements'])
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

  it('parseTab : normalise un onglet inconnu vers vue', () => {
    expect(parseTab('xyz')).toBe('vue')
    expect(parseTab('phase-future')).toBe('vue')
  })

  it('parseTab : lit les onglets ajoutés (GUIC-687)', () => {
    expect(parseTab('equipe')).toBe('equipe')
    expect(parseTab('biblio')).toBe('biblio')
    expect(parseTab('evenements')).toBe('evenements')
  })
})
