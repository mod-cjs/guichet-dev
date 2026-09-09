/**
 * M13 / Data Hub — sentinelle du contrat OpenAPI publié (GUIC-151).
 *
 * Le fichier livré jusqu'ici était écrit à la main et décrivait une API qui n'existait
 * pas : pagination par numéro de page, colonnes inventées (`nb_candidatures`,
 * `completion_profil`), endpoint `formations` jamais implémenté. C'est le sort de toute
 * documentation tenue séparément du code.
 *
 * Ces tests rendent la dérive impossible : le fichier committé doit être exactement ce que
 * produit le générateur. Sans cette sentinelle, `npm run datahub:openapi` serait une
 * commande que personne ne pense à lancer.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildOpenApiDocument } from '@/lib/datahub/openapi'
import { CHAMPS_INTERDITS } from '@/lib/datahub/stream-types'
import { streams } from '@/lib/datahub/streams'
import { fullTableStreams } from '@/lib/datahub/full-table-streams'

const CHEMIN = join(process.cwd(), 'docs', 'openapi', 'datahub-v1.yaml')
const committe = readFileSync(CHEMIN, 'utf8')

describe('contrat OpenAPI publié', () => {
  it('correspond exactement à sa régénération depuis le contrat d\'export', () => {
    expect(committe).toBe(buildOpenApiDocument())
  })

  it('déclare un chemin par flux (incrémental, FULL_TABLE), plus `/export/counts` (GUIC-697 D2), et rien de plus', () => {
    // Les clés de chemin contiennent des `/` : elles sont citées à l'émission.
    const chemins = [...committe.matchAll(/^ {2}"\/export\/(\w+)":$/gm)].map((m) => m[1])
    expect(chemins.sort()).toEqual(
      [...Object.keys(streams), ...Object.keys(fullTableStreams), 'counts'].sort()
    )
  })

  it('déclare 429 sur chaque flux, en plus de 400/401 (GUIC-697 D2)', () => {
    for (const nom of Object.keys(streams)) {
      const bloc = committe.slice(committe.indexOf(`"/export/${nom}":`))
      const finBloc = bloc.indexOf('\n  "/export/', 1)
      const section = finBloc === -1 ? bloc : bloc.slice(0, finBloc)
      expect(section).toMatch(/"429":/)
    }
  })

  it('déclare /export/counts avec since OBLIGATOIRE (GUIC-697 D6/D2)', () => {
    const bloc = committe.slice(committe.indexOf('"/export/counts":'))
    expect(bloc).toMatch(/sinceRequis/)
    expect(bloc).toMatch(/"400":/)
    expect(bloc).toMatch(/"401":/)
    expect(bloc).toMatch(/"429":/)

    // Le paramètre référencé porte bien `required: true` — sans ça la contrainte du
    // code (D6, since obligatoire) ne serait pas visible dans le contrat publié.
    const indexParam = committe.indexOf('sinceRequis:')
    expect(committe.slice(indexParam, indexParam + 300)).toMatch(/required:\s*true/)
  })

  it('ne mentionne plus les endpoints jamais implémentés', () => {
    // `formations` était documenté sans exister : une formation est une opportunité
    // dont le type vaut Formation, pas un flux distinct.
    expect(committe).not.toContain('/export/formations')
  })

  it('ne publie aucune colonne interdite', () => {
    const nus = CHAMPS_INTERDITS.filter((c) => !c.includes('.'))
    for (const champ of nus) {
      expect(committe).not.toMatch(new RegExp(`^ {8}${champ}:`, 'm'))
    }
  })

  it('porte le tier de gouvernance sur chaque colonne publiée, tous flux confondus', () => {
    // Compté depuis le contrat, pas depuis le YAML : une regex sur le fichier ramasse
    // aussi les propriétés de `meta` et donnerait une égalité qui ne prouve rien.
    const attendu =
      Object.values(streams).reduce((total, def) => total + Object.keys(def.fields).length, 0) +
      Object.values(fullTableStreams).reduce((total, def) => total + Object.keys(def.fields).length, 0)
    const tiers = (committe.match(/"x-cjs-tier":/g) ?? []).length
    expect(tiers).toBe(attendu)
    expect(tiers).toBeGreaterThan(100)
  })

  it('avertit en tête qu\'il est généré', () => {
    expect(committe.startsWith('# GÉNÉRÉ')).toBe(true)
  })
})
