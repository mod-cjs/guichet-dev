import { buildBreadcrumbs } from './buildBreadcrumbs'

describe('buildBreadcrumbs (GUIC-446)', () => {
  it('le crumb « Mon espace » pointe vers le dashboard, pas /jeune (404)', () => {
    const crumbs = buildBreadcrumbs('/jeune/mon-profil')
    expect(crumbs[0]).toEqual({ label: 'Mon espace', href: '/jeune/tableau-de-bord' })
  })

  it('conserve les segments suivants', () => {
    const crumbs = buildBreadcrumbs('/jeune/mon-profil')
    expect(crumbs[1]).toEqual({ label: 'Mon profil', href: '/jeune/mon-profil' })
  })

  it('retourne [] hors app jeune', () => {
    expect(buildBreadcrumbs('/opportunites')).toEqual([])
    expect(buildBreadcrumbs(null)).toEqual([])
  })
})
