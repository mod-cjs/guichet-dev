import { REGIONS_SENEGAL, isValidRegion, regionLabel } from '@/lib/regions'

describe('regions', () => {
  it('contient exactement les 14 régions du Sénégal', () => {
    expect(REGIONS_SENEGAL).toHaveLength(14)
  })

  it('aligne les `value` sur l\'enum Prisma (sans accents, snake_case)', () => {
    const values = REGIONS_SENEGAL.map(r => r.value).sort()
    expect(values).toEqual([
      'Dakar', 'Diourbel', 'Fatick', 'Kaffrine', 'Kaolack',
      'Kedougou', 'Kolda', 'Louga', 'Matam', 'Saint_Louis',
      'Sedhiou', 'Tambacounda', 'Thies', 'Ziguinchor',
    ])
  })

  it('porte des labels accentués', () => {
    expect(regionLabel('Thies')).toBe('Thiès')
    expect(regionLabel('Saint_Louis')).toBe('Saint-Louis')
    expect(regionLabel('Kedougou')).toBe('Kédougou')
    expect(regionLabel('Sedhiou')).toBe('Sédhiou')
  })

  it('regionLabel retourne null si valeur vide', () => {
    expect(regionLabel(null)).toBeNull()
    expect(regionLabel(undefined)).toBeNull()
  })

  it('regionLabel passe through les valeurs inconnues (pas de crash)', () => {
    expect(regionLabel('Foo')).toBe('Foo')
  })

  it('isValidRegion valide uniquement les valeurs connues', () => {
    expect(isValidRegion('Dakar')).toBe(true)
    expect(isValidRegion('Saint_Louis')).toBe(true)
    expect(isValidRegion('saint-louis')).toBe(false)
    expect(isValidRegion('')).toBe(false)
    expect(isValidRegion(null)).toBe(false)
    expect(isValidRegion(42)).toBe(false)
  })
})
