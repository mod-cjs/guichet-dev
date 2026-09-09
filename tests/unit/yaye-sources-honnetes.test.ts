/**
 * GUIC-689 — La ligne de sources de Yaye doit être VRAIE.
 *
 * Règle v5 (design-guichet-v5/CLAUDE.md) : « Aucune réponse de l'assistante
 * Yaye sans ligne de sources ». Mais une ligne de sources fausse est pire que
 * pas de ligne : elle fabrique une caution.
 *
 * Or `buildContextBlock` (agent.ts) renvoie une chaîne VIDE quand ni mémo ni
 * contexte graphe ne sont disponibles — nouvel inscrit, graphe pas encore
 * construit, ou échec de chargement. Dans ce cas « Basé sur ton profil » est un
 * mensonge. Idem pour « le catalogue » si aucun outil catalogue n'a été appelé.
 *
 * Le label doit donc être dérivé de ce qui a RÉELLEMENT servi.
 */
import { buildSourcesLabel } from '@/lib/ia/sources-label'

describe('GUIC-689 — libellé de sources dérivé du contexte réellement mobilisé', () => {
  it('profil chargé + outils catalogue → mentionne les deux', () => {
    expect(buildSourcesLabel({ graphContext: 'profil: …', memo: null, toolsUsed: ['rechercher_opportunites'] }))
      .toBe('Basé sur ton profil et le catalogue du Guichet')
  })

  it('profil chargé, aucun outil → ne prétend PAS avoir consulté le catalogue', () => {
    const label = buildSourcesLabel({ graphContext: 'profil: …', memo: null, toolsUsed: [] })
    expect(label).toBe('Basé sur ton profil')
    expect(label).not.toMatch(/catalogue/i)
  })

  it('aucun profil, outils catalogue → ne prétend PAS avoir lu le profil', () => {
    const label = buildSourcesLabel({ graphContext: '', memo: null, toolsUsed: ['rechercher_evenements'] })
    expect(label).toBe('Basé sur le catalogue du Guichet')
    expect(label).not.toMatch(/profil/i)
  })

  it('mémo seul (sans graphe) compte comme contexte personnel', () => {
    expect(buildSourcesLabel({ graphContext: '', memo: 'préférences: agriculture', toolsUsed: [] }))
      .toBe('Basé sur ton profil')
  })

  it('ni contexte ni outil → AUCUNE ligne de sources (plutôt qu’une ligne fausse)', () => {
    expect(buildSourcesLabel({ graphContext: '', memo: null, toolsUsed: [] })).toBeNull()
    expect(buildSourcesLabel({ graphContext: '   ', memo: '  ', toolsUsed: [] })).toBeNull()
  })
})
