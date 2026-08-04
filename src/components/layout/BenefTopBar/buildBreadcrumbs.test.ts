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

  // GUIC-689 (Lot E3) — un segment dynamique absent de SEGMENT_LABELS
  // (ex. l'UUID d'une candidature) ne doit jamais afficher un identifiant
  // technique brut à l'utilisateur : on retombe sur un libellé générique.
  describe('jamais d\'identifiant technique affiché (GUIC-689)', () => {
    it('remplace un segment UUID par un libellé générique', () => {
      const crumbs = buildBreadcrumbs(
        '/jeune/mes-candidatures/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      )
      expect(crumbs[2]).toEqual({
        label: 'Détail',
        href: '/jeune/mes-candidatures/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      })
    })

    it('remplace un segment purement numérique par un libellé générique', () => {
      const crumbs = buildBreadcrumbs('/jeune/mes-formations/123456')
      expect(crumbs[2].label).toBe('Détail')
    })

    it('ne rend jamais un libellé au format UUID, quel que soit le point d\'entrée', () => {
      const crumbs = buildBreadcrumbs(
        '/jeune/mes-candidatures/3fa85f64-5717-4562-b3fc-2c963f66afa6',
      )
      const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      crumbs.forEach(c => expect(c.label).not.toMatch(uuidRe))
    })

    it('conserve un segment lisible normal (non technique) tel quel', () => {
      const crumbs = buildBreadcrumbs('/jeune/mes-candidatures')
      expect(crumbs[1]).toEqual({
        label: 'Mes candidatures',
        href: '/jeune/mes-candidatures',
      })
    })
  })
})
