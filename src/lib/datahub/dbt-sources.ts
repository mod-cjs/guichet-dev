/**
 * M13 / Data Hub — sources dbt générées depuis le contrat d'export (lot 8, spec §7).
 *
 * Cinquième et dernier artefact dérivé du dictionnaire. Une description écrite dans
 * `schema.prisma` atteint donc : les `COMMENT` MariaDB, l'OpenAPI publié, le catalogue
 * Singer, les commentaires de colonnes PostgreSQL via le loader, et `dbt docs`. Une seule
 * prose, jamais recopiée.
 *
 * DEUX APPORTS AU-DELÀ DE LA DOCUMENTATION
 *
 * `loaded_at_field` arme `dbt source freshness`, qui détecte un pipeline arrêté. Sans lui,
 * un tap qui ne tourne plus produit un entrepôt parfaitement cohérent et parfaitement
 * périmé — le mode de panne le plus difficile à repérer.
 *
 * Les tests `unique` et `not_null` sur la clé primaire vérifient le travail du loader :
 * le recouvrement du tap produit volontairement des doublons, que seul un upsert correct
 * absorbe. Un doublon qui survit signale un `load_method` mal configuré.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSchemaDoc, parseEnums } from './schema-doc'
import { allDescriptors } from './descriptor'
import { resoudreColonnes } from './openapi'
import { renderYamlDocument, type YamlValue } from './yaml'
import { streams } from './streams'

/** Schéma PostgreSQL alimenté par le loader — doit suivre `meltano.yml`. */
export const SCHEMA_SOURCE = 'guichet_raw'

export function buildDbtSources(schemaPath?: string): string {
  const source = readFileSync(schemaPath ?? join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
  const models = parseSchemaDoc(source)
  const enums = parseEnums(source)

  const tables: YamlValue[] = allDescriptors().map((descriptor) => {
    const model = models.find((m) => m.model === descriptor.model)
    if (!model) throw new Error(`modèle absent du schéma : ${descriptor.model}`)
    if (model.doc === null) throw new Error(`modèle exporté non documenté : ${descriptor.model}`)

    const nomExporte = (field: string): string =>
      descriptor.columns.find((c) => c.field === field)?.as ?? field
    const clePrimaire = nomExporte(descriptor.primaryKey)

    const colonnes: YamlValue[] = Object.entries(
      resoudreColonnes(descriptor, model.fields, enums)
    ).map(([nom, colonne]) => ({
      name: nom,
      description: colonne.description,
      // Le tier descend jusqu'ici : il peut piloter des politiques de masquage côté
      // entrepôt sans que personne ait à retenir quelles colonnes sont sensibles.
      meta: { cjs_tier: colonne.tier },
      ...(nom === clePrimaire ? { tests: ['unique', 'not_null'] } : {}),
    }))

    return {
      name: descriptor.name,
      description: model.doc,
      loaded_at_field: nomExporte(descriptor.replicationKey),
      freshness: {
        // Cadence quotidienne : un retard d'un jour est tolérable, deux signalent un arrêt.
        warn_after: { count: 36, period: 'hour' },
        error_after: { count: 48, period: 'hour' },
      },
      columns: colonnes,
    }
  })

  const document: YamlValue = {
    version: 2,
    sources: [
      {
        name: SCHEMA_SOURCE,
        description:
          "Données brutes déversées par le tap Guichet. Ne jamais écrire dans ce schéma : il est reconstruit par le pipeline, et toute modification manuelle serait perdue au run suivant.",
        schema: SCHEMA_SOURCE,
        tables,
      },
    ],
  }

  return renderYamlDocument(
    document,
    '# GÉNÉRÉ — ne pas éditer à la main. Source : src/lib/datahub/streams.ts + prisma/schema.prisma\n' +
      '# Régénérer : npm run datahub:dbt\n'
  )
}

/** Nombre de flux décrits — utilisé par les tests pour éviter un oubli silencieux. */
export const NB_FLUX = Object.keys(streams).length
