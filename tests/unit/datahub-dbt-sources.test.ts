/**
 * M13 / Data Hub — sources dbt générées (lot 8).
 *
 * Cinquième et dernier artefact dérivé du dictionnaire. Une description écrite dans
 * `schema.prisma` atteint désormais les COMMENT MariaDB, l'OpenAPI, le catalogue Singer,
 * les commentaires de colonnes PostgreSQL et `dbt docs` — sans avoir été recopiée.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { buildDbtSources, SCHEMA_SOURCE } from '@/lib/datahub/dbt-sources'
import { streams } from '@/lib/datahub/streams'

const CHEMIN = join(process.cwd(), 'etl', 'transform', 'models', 'sources.yml')
const committe = readFileSync(CHEMIN, 'utf8')

describe('sources dbt', () => {
  it('correspondent exactement à leur régénération', () => {
    expect(committe).toBe(buildDbtSources())
  })

  it('déclarent une table par flux du contrat', () => {
    const tables = [...committe.matchAll(/^ {6}- name: "(\w+)"$/gm)].map((m) => m[1])
    expect(tables.sort()).toEqual(Object.keys(streams).sort())
  })

  it('arment la détection de fraîcheur sur chaque flux', () => {
    // Sans `loaded_at_field`, un tap arrêté produit un entrepôt parfaitement cohérent et
    // parfaitement périmé — le mode de panne le plus difficile à repérer.
    const freshness = (committe.match(/loaded_at_field:/g) ?? []).length
    expect(freshness).toBe(Object.keys(streams).length)
  })

  it('testent l\'unicité de chaque clé primaire', () => {
    // Vérifie le travail du loader : le recouvrement du tap produit volontairement des
    // doublons, que seul un upsert correct absorbe. Un doublon qui survit signale un
    // `load_method` mal configuré.
    const uniques = (committe.match(/- "unique"/g) ?? []).length
    expect(uniques).toBe(Object.keys(streams).length)
  })

  it('propagent le tier de gouvernance sur chaque colonne', () => {
    const attendu = Object.values(streams).reduce(
      (total, def) => total + Object.keys(def.fields).length,
      0
    )
    expect((committe.match(/cjs_tier:/g) ?? []).length).toBe(attendu)
  })

  it('pointent le schéma réellement alimenté par le loader', () => {
    // Doit rester aligné avec `default_target_schema` de meltano.yml, sinon dbt lit un
    // schéma vide et tous les marts sortent à zéro sans erreur.
    expect(committe).toContain(`name: "${SCHEMA_SOURCE}"`)
    const meltano = readFileSync(join(process.cwd(), 'etl', 'meltano.yml'), 'utf8')
    expect(meltano).toContain(`default_target_schema: ${SCHEMA_SOURCE}`)
  })

  it('avertissent en tête qu\'elles sont générées', () => {
    expect(committe.startsWith('# GÉNÉRÉ')).toBe(true)
  })
})
