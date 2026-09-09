import { calculerScore } from '@/lib/profil-score'

// Helpers : factories minimales pour garder les cas lisibles
const emptyIdentite = { region: null, commune: null, genre: null, dateNaissance: null }

const fullIdentite = {
  region:        'DAKAR',
  commune:       'Plateau',
  genre:         'M',
  dateNaissance: '2000-01-01',
}

const fullProfil = {
  biographie:      'bio',
  niveauEtude:     'licence',
  situationEmploi: 'en_recherche',
  domainesInteret: ['Numérique'],
  competences:     ['JavaScript'],
}

describe('calculerScore', () => {
  describe('cas de base — sans diplômes', () => {
    it('retourne 0 pour un profil totalement vide', () => {
      expect(calculerScore(emptyIdentite, null, 0, 0)).toBe(0)
    })

    it("retourne 25 pour l'identité seule complète", () => {
      // region 10 + genre 5 + dateNaissance 5 + commune 5 = 25
      expect(calculerScore(fullIdentite, null, 0, 0)).toBe(25)
    })

    it('retourne 80 pour identité + profil pro complets, sans expérience ni diplôme', () => {
      // 25 (identité) + 20 (bio) + 10 (niveau) + 10 (situation) + 15 (domaines) + 10 (compétences)
      expect(calculerScore(fullIdentite, fullProfil, 0, 0)).toBe(80)
    })

    it('retourne 90 avec une expérience (sans diplôme)', () => {
      expect(calculerScore(fullIdentite, fullProfil, 1, 0)).toBe(90)
    })
  })

  describe('intégration des diplômes (GUIC-19)', () => {
    it("ajoute exactement 10 points dès qu'il y a au moins un diplôme", () => {
      const sans = calculerScore(fullIdentite, fullProfil, 0, 0)
      const avec = calculerScore(fullIdentite, fullProfil, 0, 1)
      expect(avec - sans).toBe(10)
    })

    it("ne compte les diplômes qu'une fois quel que soit le nombre (≥ 1 = +10)", () => {
      const un  = calculerScore(fullIdentite, fullProfil, 0, 1)
      const dix = calculerScore(fullIdentite, fullProfil, 0, 10)
      expect(un).toBe(dix)
    })

    it('atteint 100 — et EXACTEMENT 100 — quand tout est présent (barème rééquilibré, plus de plafonnement)', () => {
      expect(calculerScore(fullIdentite, fullProfil, 3, 2)).toBe(100)
    })

    it('un jeune sans expérience mais avec un diplôme atteint 90', () => {
      expect(calculerScore(fullIdentite, fullProfil, 0, 1)).toBe(90)
    })
  })

  describe('no-regression — cas GUIC-18 préservés', () => {
    it('identité partielle (region seule) = 10', () => {
      expect(calculerScore({ ...emptyIdentite, region: 'DAKAR' }, null, 0, 0)).toBe(10)
    })

    it('domainesInteret vide ne donne pas les 10 pts', () => {
      const profil = { ...fullProfil, domainesInteret: [] }
      // 25 + 20 + 10 + 10 + 0 + 10 = 75
      expect(calculerScore(fullIdentite, profil, 0, 0)).toBe(70)
    })

    it('competences vide ne donne pas les 10 pts', () => {
      const profil = { ...fullProfil, competences: [] }
      // identité 25 + biographie 15 + niveau 10 + situation 10 + secteurs 10 + compétences 0 = 70
      expect(calculerScore(fullIdentite, profil, 0, 0)).toBe(70)
    })

    it('profil = null → identité + exp + diplôme comptent indépendamment du profil pro', () => {
      // 25 (identité) + 10 (exp) + 10 (diplôme) = 45
      expect(calculerScore(fullIdentite, null, 5, 5)).toBe(45)
    })
  })

  describe('borne inférieure', () => {
    it('diplomeCount négatif ou nul = 0 pts', () => {
      expect(calculerScore(emptyIdentite, null, 0, 0)).toBe(0)
      expect(calculerScore(emptyIdentite, null, 0, -1)).toBe(0)
    })

    it('expCount négatif ou nul = 0 pts', () => {
      expect(calculerScore(emptyIdentite, null, -5, 0)).toBe(0)
    })
  })
})
