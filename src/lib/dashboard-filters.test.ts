import { parseFilters, periodeFrom, periodeLabel, PERIODES, type Periode } from './dashboard-filters'

describe('dashboard-filters — filtres transverses (période + région)', () => {
  describe('parseFilters', () => {
    it('défaut : 12 mois glissants, national', () => {
      expect(parseFilters({})).toEqual({ periode: '12mois', region: 'all' })
    })
    it('lit période + région valides', () => {
      expect(parseFilters({ periode: 'mois', region: 'Dakar' })).toEqual({ periode: 'mois', region: 'Dakar' })
    })
    it('normalise une période inconnue vers le défaut', () => {
      expect(parseFilters({ periode: 'xyz' }).periode).toBe('12mois')
    })
    it('normalise une région inconnue vers "all"', () => {
      expect(parseFilters({ region: 'Atlantide' }).region).toBe('all')
    })
  })

  describe('periodeFrom', () => {
    const now = new Date('2026-07-15T12:00:00Z')
    it('mois → 1er du mois courant', () => {
      expect(periodeFrom('mois', now).toISOString().slice(0, 10)).toBe('2026-07-01')
    })
    it('annee → 1er janvier', () => {
      expect(periodeFrom('annee', now).toISOString().slice(0, 10)).toBe('2026-01-01')
    })
    it('trimestre → 90 jours glissants', () => {
      const d = periodeFrom('trimestre', now)
      expect(Math.round((now.getTime() - d.getTime()) / 86_400_000)).toBe(90)
    })
    it('12mois → 365 jours glissants', () => {
      const d = periodeFrom('12mois', now)
      expect(Math.round((now.getTime() - d.getTime()) / 86_400_000)).toBe(365)
    })
  })

  describe('periodeLabel', () => {
    it('libellés lisibles', () => {
      expect(periodeLabel('mois')).toBe('Ce mois')
      expect(periodeLabel('12mois')).toBe('12 mois')
    })
  })

  it('PERIODES expose les 4 options ordonnées', () => {
    expect(PERIODES.map((p) => p.value)).toEqual<Periode[]>(['mois', 'trimestre', 'annee', '12mois'])
  })
})
