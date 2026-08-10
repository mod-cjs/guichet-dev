/**
 * GUIC-704 · fiche riche — le brouillon publié doit être AUTO-SUFFISANT : la description
 * composée agrège description + profil recherché + comment postuler + lieu + rémunération.
 */
import { construireInputPublication } from '@/lib/curation/publication/mapper'

describe('GUIC-704 — construireInputPublication : fiche riche', () => {
  it('compose une description structurée à partir des champs de décision', () => {
    const input = construireInputPublication('emploi', {
      titre: 'Développeur Fullstack',
      description: 'GBG recrute un développeur fullstack pour ses projets bancaires à Dakar.',
      profil: 'Bac+3, 2 ans d’expérience React/Node.',
      commentPostuler: 'Envoyer CV à jobs@gbg.sn avant le 30 août.',
      lieu: 'Dakar, Plateau',
      remuneration: '500 000 FCFA/mois',
    })
    const desc = input.base.description
    expect(desc).toContain('GBG recrute un développeur fullstack') // résumé
    expect(desc).toContain('Profil recherché')
    expect(desc).toContain('Bac+3')
    expect(desc).toContain('Comment postuler')
    expect(desc).toContain('jobs@gbg.sn')
    expect(desc).toContain('Lieu')
    expect(desc).toContain('Dakar, Plateau')
    expect(desc).toContain('Rémunération')
    expect(desc).toContain('500 000 FCFA')
  })

  it('sans champs riches : description = le résumé seul (rétrocompat)', () => {
    const input = construireInputPublication('emploi', { titre: 'Poste X', description: 'Un poste à Dakar.' })
    expect(input.base.description).toBe('Un poste à Dakar.')
  })

  it('description vide ET pas de champs riches → repli sur le titre', () => {
    const input = construireInputPublication('emploi', { titre: 'Poste sans détail' })
    expect(input.base.description).toBe('Poste sans détail')
  })
})
