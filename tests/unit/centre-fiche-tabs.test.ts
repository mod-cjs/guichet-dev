/** GUIC-687 — onglets de la fiche Centre : ordre maquette + normalisation. */
import { CENTRE_TABS, parseTab } from '@/lib/centre-fiche-tabs'

describe('centre-fiche-tabs', () => {
  it('respecte l’ordre maquette avec Équipe & accès en 2e', () => {
    expect(CENTRE_TABS.map((t) => t.value)).toEqual(['vue', 'equipe', 'ressources', 'frequentation'])
    expect(CENTRE_TABS[1].label).toBe('Équipe & accès')
  })

  it('parseTab reconnaît equipe et retombe sur vue par défaut', () => {
    expect(parseTab('equipe')).toBe('equipe')
    expect(parseTab('inconnu')).toBe('vue')
    expect(parseTab(null)).toBe('vue')
  })
})
