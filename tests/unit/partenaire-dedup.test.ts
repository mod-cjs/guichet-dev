/**
 * GUIC-705 — dédup de promotion curation→partenaire : normalisation de nom d'organisation
 * pour suggérer les partenaires existants (« GIZ Sénégal SARL » ≈ « giz senegal »).
 */
import { normaliserNomOrg } from '@/lib/partenaire-dedup'

describe('GUIC-705 — normaliserNomOrg', () => {
  it.each([
    ['GIZ Sénégal SARL', 'giz senegal'],
    ['HORIZONTP SUARL', 'horizontp'],
    ['Éduc-Avenir', 'educ avenir'],
    ['  Wave   Money  ', 'wave money'],
    ['Mercy Corps', 'mercy corps'],
    ['SARL', 'sarl'], // ne vide pas un nom qui n'est QUE la forme juridique
  ])('%s → %s', (input, expected) => {
    expect(normaliserNomOrg(input)).toBe(expected)
  })

  it('deux variantes du même employeur normalisent pareil (préfixe commun)', () => {
    expect(normaliserNomOrg('HORIZONTP SUARL')).toBe(normaliserNomOrg('Horizontp'))
  })
})
