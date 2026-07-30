import { jourCourant, statutOuverture, type HoraireLite } from './centre-horaire'

describe('centre-horaire — statut d\'ouverture (fiche Centre OV)', () => {
  it('jourCourant : mappe getDay() JS vers l\'enum Jour', () => {
    expect(jourCourant(new Date('2026-07-27T10:00:00'))).toBe('Lundi')    // lundi
    expect(jourCourant(new Date('2026-07-31T10:00:00'))).toBe('Vendredi') // vendredi
    expect(jourCourant(new Date('2026-08-02T10:00:00'))).toBe('Dimanche') // dimanche
  })

  const H: HoraireLite[] = [
    { jour: 'Lundi', ouvert: true, ouvreA: '08:00', fermeA: '17:00' },
    { jour: 'Dimanche', ouvert: false, ouvreA: null, fermeA: null },
  ]

  it('ouvert : renvoie l\'heure de fermeture', () => {
    const s = statutOuverture(H, new Date('2026-07-27T10:00:00')) // lundi 10h
    expect(s.ouvert).toBe(true)
    expect(s.label).toBe('Ouvert · ferme 17:00')
  })

  it('avant l\'ouverture : fermé', () => {
    const s = statutOuverture(H, new Date('2026-07-27T07:00:00')) // lundi 7h
    expect(s.ouvert).toBe(false)
    expect(s.label).toBe('Fermé')
  })

  it('jour sans horaire ou marqué fermé : fermé', () => {
    expect(statutOuverture(H, new Date('2026-08-02T10:00:00')).ouvert).toBe(false) // dimanche
    expect(statutOuverture([], new Date('2026-07-27T10:00:00')).ouvert).toBe(false) // vide
  })
})
