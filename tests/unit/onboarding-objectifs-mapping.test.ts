/**
 * @jest-environment node
 *
 * GUIC-689 — Ce que l'onboarding capte des objectifs ne doit rien perdre.
 *
 * DÉFAUT CONSTATÉ. Les cinq objectifs proposés à l'inscription étaient tous
 * forcés dans `domainesInteret` — un champ de SECTEURS — via un mapping qui :
 *
 *  1. renvoyait `null` pour « emploi », le choix le plus probable sur une
 *     plateforme jeunesse-emploi : la sélection disparaissait en silence ;
 *  2. produisait trois valeurs HORS du référentiel `DOMAINES_INTERET` —
 *     « Education » (le référentiel écrit « Éducation »), « Citoyennete » et
 *     « Entrepreneuriat », absents. Stockées telles quelles, elles ne
 *     correspondaient à aucune puce du formulaire de profil : le jeune ne les
 *     voyait pas sélectionnées, et elles disparaissaient à sa première
 *     sauvegarde.
 *
 * L'erreur était de modélisation : « trouver un emploi », « me former »,
 * « m'engager » sont des INTENTIONS, pas des secteurs. `typesRecherches`
 * existe désormais pour ça.
 */
import { mapObjectif } from '@/app/jeune/onboarding/_logic/mapping-objectifs'
import { DOMAINES_INTERET } from '@/lib/profil-constants'
import { TYPES_RECHERCHES } from '@/app/api/profil/schema'

const OBJECTIFS = ['emploi', 'projet', 'formation', 'agriculture', 'engagement'] as const

describe('GUIC-689 — aucun objectif ne se perd', () => {
  it.each(OBJECTIFS)('« %s » produit au moins une valeur exploitable', (o) => {
    const { domaines, types } = mapObjectif(o)
    expect(domaines.length + types.length).toBeGreaterThan(0)
  })

  it('« emploi » n’est plus ignoré', () => {
    expect(mapObjectif('emploi').types).toContain('emploi')
  })
})

describe('GUIC-689 — toute valeur produite appartient à son référentiel', () => {
  it.each(OBJECTIFS)('« %s » ne sort aucun secteur inconnu', (o) => {
    for (const d of mapObjectif(o).domaines) {
      expect(DOMAINES_INTERET as readonly string[]).toContain(d)
    }
  })

  it.each(OBJECTIFS)('« %s » ne sort aucun type inconnu', (o) => {
    for (const t of mapObjectif(o).types) {
      expect(TYPES_RECHERCHES as readonly string[]).toContain(t)
    }
  })
})

describe('GUIC-689 — intention et secteur ne se confondent pas', () => {
  it('« me former » est une intention, pas un secteur', () => {
    const r = mapObjectif('formation')
    expect(r.types).toContain('formation')
    expect(r.domaines).toEqual([])
  })

  it('« travailler dans l’agriculture » est bien un secteur', () => {
    expect(mapObjectif('agriculture').domaines).toContain('Agriculture')
  })

  it('un identifiant inconnu ne fabrique rien', () => {
    expect(mapObjectif('inexistant')).toEqual({ domaines: [], types: [] })
  })
})
