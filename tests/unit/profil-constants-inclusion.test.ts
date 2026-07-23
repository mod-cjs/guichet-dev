import {
  HANDICAP_OPTIONS,
  ZONE_HABITATION_OPTIONS,
  handicapLabel,
  zoneLabel,
} from '@/lib/profil-constants'

// GUIC-660 — constantes des champs socio-démographiques inclusion.

describe('HANDICAP_OPTIONS', () => {
  it('expose exactement les 6 valeurs de l\'enum Prisma Handicap', () => {
    expect(HANDICAP_OPTIONS.map(o => o.value)).toEqual([
      'aucun', 'moteur', 'visuel', 'auditif', 'autre', 'non_precise',
    ])
  })

  it('associe un libellé FR non vide à chaque valeur', () => {
    for (const o of HANDICAP_OPTIONS) {
      expect(o.label.length).toBeGreaterThan(0)
    }
  })
})

describe('ZONE_HABITATION_OPTIONS', () => {
  it('expose exactement rural et urbain', () => {
    expect(ZONE_HABITATION_OPTIONS.map(o => o.value)).toEqual(['rural', 'urbain'])
  })
})

describe('handicapLabel', () => {
  it('retourne le libellé FR pour une valeur connue', () => {
    expect(handicapLabel('moteur')).toBe('Moteur')
  })

  it('retourne null pour null/undefined/chaîne vide', () => {
    expect(handicapLabel(null)).toBeNull()
    expect(handicapLabel(undefined)).toBeNull()
    expect(handicapLabel('')).toBeNull()
  })

  it('retourne la valeur brute pour une valeur inconnue (fallback)', () => {
    expect(handicapLabel('inconnu')).toBe('inconnu')
  })
})

describe('zoneLabel', () => {
  it('retourne le libellé FR pour une valeur connue', () => {
    expect(zoneLabel('rural')).toBe('Rural')
    expect(zoneLabel('urbain')).toBe('Urbain')
  })

  it('retourne null pour null/undefined', () => {
    expect(zoneLabel(null)).toBeNull()
    expect(zoneLabel(undefined)).toBeNull()
  })
})
