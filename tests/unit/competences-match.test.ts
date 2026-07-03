/**
 * @jest-environment node
 *
 * GUIC-517 — Rapprochement compétences candidat ↔ compétences requises de l'offre.
 */
import { matchCompetences } from '@/lib/recruteur/competences-match'

describe('GUIC-517 — matchCompetences', () => {
  it('marque chaque compétence requise comme possédée ou non (insensible casse/accents/espaces)', () => {
    const r = matchCompetences(['Gestion de projet', 'Excel', 'Anglais'], ['excel ', 'GESTION DE PROJET', 'Couture'])
    expect(r.requises).toEqual([
      { libelle: 'Gestion de projet', possede: true },
      { libelle: 'Excel', possede: true },
      { libelle: 'Anglais', possede: false },
    ])
  })

  it('liste les compétences du candidat hors offre dans « autres »', () => {
    const r = matchCompetences(['Excel'], ['Excel', 'Couture', 'Soudure'])
    expect(r.autres).toEqual(['Couture', 'Soudure'])
  })

  it('calcule le taux de couverture (arrondi %) des compétences requises', () => {
    expect(matchCompetences(['A', 'B', 'C', 'D'], ['a', 'b']).tauxCouverture).toBe(50)
    expect(matchCompetences(['A'], ['a']).tauxCouverture).toBe(100)
  })

  it('offre sans compétence requise → taux 0, aucune requise, tout en autres', () => {
    const r = matchCompetences([], ['Excel'])
    expect(r.requises).toEqual([])
    expect(r.autres).toEqual(['Excel'])
    expect(r.tauxCouverture).toBe(0)
  })

  it('ignore les entrées vides des deux côtés', () => {
    const r = matchCompetences(['Excel', '  '], ['', 'excel'])
    expect(r.requises).toEqual([{ libelle: 'Excel', possede: true }])
    expect(r.autres).toEqual([])
  })
})
