import { sectorKey, sectorVar, sectorLabel } from './partenaire-secteur'

describe('partenaire-secteur (mapping Domaine -> couleur/label letterhead)', () => {
  it('sectorKey : normalise vers une clé connue, sinon "autre"', () => {
    expect(sectorKey('Numerique')).toBe('numerique')
    expect(sectorKey('AGRICULTURE')).toBe('agriculture')
    expect(sectorKey('Santé')).toBe('sante') // accent toléré
    expect(sectorKey('inconnu')).toBe('autre')
    expect(sectorKey(null)).toBe('autre')
    expect(sectorKey(undefined)).toBe('autre')
  })

  it('sectorVar : renvoie le token RGB correspondant', () => {
    expect(sectorVar('Numerique')).toBe('--gj-sector-numerique')
    expect(sectorVar('xyz')).toBe('--gj-sector-autre')
  })

  it('sectorLabel : lisible (underscores -> espaces, capitalisé)', () => {
    expect(sectorLabel('Numerique')).toBe('Numerique')
    expect(sectorLabel('appel_a_projets')).toBe('Appel a projets')
    expect(sectorLabel(null)).toBe('Autre')
  })
})
