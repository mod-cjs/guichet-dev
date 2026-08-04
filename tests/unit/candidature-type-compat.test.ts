/**
 * Tests du mapping de compatibilité GUIC-689 entre `CandidatureMock['type']`
 * (mock candidatures, 7 valeurs) et l'enum Prisma réel `TypeOpportunite`
 * (6 valeurs) consommé par `OpportuniteTypeChip` / `TYPE_CAT`.
 */
import {
  mockTypeToOpportuniteType,
  catFamilyForMockType,
  CAT_TILE_CLASSES,
  CAT_BADGE_SOFT_CLASSES,
} from '@/components/candidatures/candidature-type-compat'

describe('mockTypeToOpportuniteType()', () => {
  it('mappe les types directs vers leur valeur enum Prisma identique', () => {
    expect(mockTypeToOpportuniteType('Emploi')).toBe('Emploi')
    expect(mockTypeToOpportuniteType('Stage')).toBe('Stage')
    expect(mockTypeToOpportuniteType('Formation')).toBe('Formation')
    expect(mockTypeToOpportuniteType('Bourse')).toBe('Bourse')
    expect(mockTypeToOpportuniteType('Volontariat')).toBe('Volontariat')
  })

  it("mappe 'Appel à projets' (libellé mock) vers Appel_a_projets (valeur enum)", () => {
    expect(mockTypeToOpportuniteType('Appel à projets')).toBe('Appel_a_projets')
  })

  it("retourne null pour 'Concours', absent de l'enum Prisma", () => {
    expect(mockTypeToOpportuniteType('Concours')).toBeNull()
  })
})

describe('catFamilyForMockType()', () => {
  it('retombe sur la même famille catégorie que TYPE_CAT pour les types directs', () => {
    expect(catFamilyForMockType('Emploi')).toBe('cat-emploi')
    expect(catFamilyForMockType('Stage')).toBe('cat-stage')
    expect(catFamilyForMockType('Formation')).toBe('cat-formation')
    expect(catFamilyForMockType('Bourse')).toBe('cat-financement')
    expect(catFamilyForMockType('Volontariat')).toBe('cat-volontariat')
    expect(catFamilyForMockType('Appel à projets')).toBe('cat-financement')
  })

  it("retourne 'cat-neutre' pour 'Concours' (jamais une couleur de catégorie empruntée)", () => {
    expect(catFamilyForMockType('Concours')).toBe('cat-neutre')
  })
})

describe('CAT_TILE_CLASSES / CAT_BADGE_SOFT_CLASSES', () => {
  it('couvrent toutes les familles catégorie (aucune classe hex, tokens --cat-* uniquement)', () => {
    const families = [
      'cat-emploi',
      'cat-stage',
      'cat-formation',
      'cat-financement',
      'cat-evenement',
      'cat-volontariat',
      'cat-neutre',
    ] as const
    for (const fam of families) {
      expect(CAT_TILE_CLASSES[fam]).toMatch(new RegExp(`bg-${fam}\\b`))
      expect(CAT_TILE_CLASSES[fam]).toMatch(/text-white/)
      expect(CAT_BADGE_SOFT_CLASSES[fam]).toMatch(new RegExp(`bg-${fam}-soft`))
      expect(CAT_BADGE_SOFT_CLASSES[fam]).toMatch(new RegExp(`text-${fam}-ink`))
    }
  })
})
