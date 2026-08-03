/**
 * @jest-environment node
 *
 * GUIC-691 — Correspondance « libellé métier → catégorie couleur v5 ».
 *
 * Règle v5 (README du handoff) : la couleur d'une pastille se DÉDUIT du libellé
 * de catégorie, elle n'est jamais choisie au cas par cas. Sans table unique, deux
 * écrans finiraient par peindre la même offre de deux couleurs différentes.
 *
 * Le rouge est exclu de cette table : en v5 il ne signale QUE l'urgence
 * d'échéance, jamais un type d'offre.
 */

import {
  CATEGORIES_V5,
  categorieDepuisType,
  classeCategorie,
  type CategorieV5,
} from '@/lib/design/categories'

describe('GUIC-691 — catégories couleur v5', () => {
  describe('CATEGORIES_V5', () => {
    it('correspond exactement aux tokens --cat-* déclarés', () => {
      expect([...CATEGORIES_V5].sort()).toEqual([
        'emploi',
        'evenement',
        'financement',
        'formation',
        'neutre',
        'stage',
        'volontariat',
      ])
    })
  })

  describe('categorieDepuisType', () => {
    it('mappe les types d’opportunité qui ont leur couleur propre', () => {
      expect(categorieDepuisType('Emploi')).toBe('emploi')
      expect(categorieDepuisType('Stage')).toBe('stage')
      expect(categorieDepuisType('Formation')).toBe('formation')
      expect(categorieDepuisType('Volontariat')).toBe('volontariat')
    })

    it('regroupe sous « financement » tout ce qui finance un projet', () => {
      expect(categorieDepuisType('Bourse')).toBe('financement')
      expect(categorieDepuisType('Financement')).toBe('financement')
      expect(categorieDepuisType('AppelAProjets')).toBe('financement')
    })

    it('retombe sur « neutre » plutôt que d’inventer une couleur', () => {
      expect(categorieDepuisType('Concours')).toBe('neutre')
      expect(categorieDepuisType('Mentorat')).toBe('neutre')
      expect(categorieDepuisType('Mobilite')).toBe('neutre')
      expect(categorieDepuisType(null)).toBe('neutre')
      expect(categorieDepuisType('TypeInconnuDeDemain')).toBe('neutre')
    })

    it('est insensible à la casse et aux accents des libellés affichés', () => {
      expect(categorieDepuisType('emploi')).toBe('emploi')
      expect(categorieDepuisType('EMPLOI')).toBe('emploi')
      expect(categorieDepuisType('Appel à projets')).toBe('financement')
    })

    it('range les événements sur leur propre couleur', () => {
      expect(categorieDepuisType('Atelier')).toBe('evenement')
      expect(categorieDepuisType('Forum')).toBe('evenement')
      expect(categorieDepuisType('Webinar')).toBe('evenement')
    })
  })

  describe('classeCategorie', () => {
    it('produit le couple de classes attendu par tokens.css', () => {
      expect(classeCategorie('stage')).toBe('gj-cat gj-cat--stage')
      expect(classeCategorie('neutre')).toBe('gj-cat gj-cat--neutre')
    })

    it('accepte directement un libellé métier', () => {
      expect(classeCategorie(categorieDepuisType('Bourse'))).toBe('gj-cat gj-cat--financement')
    })

    it('ne produit jamais de classe rouge — le rouge est réservé à l’urgence', () => {
      for (const c of CATEGORIES_V5) {
        expect(classeCategorie(c as CategorieV5)).not.toContain('red')
        expect(classeCategorie(c as CategorieV5)).not.toContain('urgent')
      }
    })
  })
})
