/**
 * M13 / Data Hub — dérivations appliquées avant export (lot 3, spec §7.1).
 *
 * `trancheAge` existe pour une seule raison : permettre l'analyse par âge sans jamais
 * livrer la date de naissance, qui est identifiante. Une erreur de bornes ici fausserait
 * silencieusement tous les indicateurs jeunesse — d'où le soin porté aux cas limites.
 */
import { trancheAge, jour } from '@/lib/datahub/transforms'

const REF = new Date('2026-07-30T12:00:00.000Z')

describe('trancheAge', () => {
  it('classe dans la tranche correspondant à l\'âge révolu', () => {
    expect(trancheAge(new Date('2010-01-01T00:00:00Z'), REF)).toBe('-18')
    expect(trancheAge(new Date('2004-01-01T00:00:00Z'), REF)).toBe('18-24')
    expect(trancheAge(new Date('1999-01-01T00:00:00Z'), REF)).toBe('25-29')
    expect(trancheAge(new Date('1994-01-01T00:00:00Z'), REF)).toBe('30-34')
    expect(trancheAge(new Date('1980-01-01T00:00:00Z'), REF)).toBe('35+')
  })

  it('ne compte pas une année dont l\'anniversaire n\'est pas encore passé', () => {
    // 18 ans le 31 juillet 2026 : la veille, la personne en a encore 17.
    expect(trancheAge(new Date('2008-07-31T00:00:00Z'), REF)).toBe('-18')
    expect(trancheAge(new Date('2008-07-30T00:00:00Z'), REF)).toBe('18-24')
  })

  it('bascule de tranche le jour même de l\'anniversaire', () => {
    expect(trancheAge(new Date('2001-07-30T00:00:00Z'), REF)).toBe('25-29')
    expect(trancheAge(new Date('2001-07-31T00:00:00Z'), REF)).toBe('18-24')
  })

  it('rend "inconnu" plutôt qu\'une tranche fausse pour une date absente', () => {
    expect(trancheAge(null, REF)).toBe('inconnu')
  })

  it('rend "inconnu" pour une date aberrante, sans inventer de tranche plausible', () => {
    expect(trancheAge(new Date('2030-01-01T00:00:00Z'), REF)).toBe('inconnu')
    expect(trancheAge(new Date('1850-01-01T00:00:00Z'), REF)).toBe('inconnu')
  })

  it('n\'expose jamais la date source dans sa sortie', () => {
    const sortie = trancheAge(new Date('1999-03-17T00:00:00Z'), REF)
    expect(sortie).not.toMatch(/1999|03|17/)
  })
})

describe('jour', () => {
  it('réduit un horodatage à sa date, sans heure', () => {
    expect(jour(new Date('2026-07-30T23:45:12.500Z'))).toBe('2026-07-30')
  })

  it('propage l\'absence de valeur', () => {
    expect(jour(null)).toBeNull()
  })
})
