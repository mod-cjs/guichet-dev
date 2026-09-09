/**
 * M13 / Data Hub — manifeste du tap Singer, généré depuis le contrat d'export (lot 7).
 *
 * UN MANIFESTE, PAS DES CLASSES GÉNÉRÉES
 * Le tap lit ce fichier au démarrage et construit ses flux à partir de lui. Le code Python
 * reste donc statique : ajouter un flux au Data Hub ne demande de toucher ni au tap, ni à
 * `meltano.yml` — seulement au contrat, qui est vérifié par `tsc` et par les gardes CDP.
 *
 * Les descriptions descendent jusqu'au bout : Singer les propage dans le catalogue, et un
 * `target-postgres` les écrit en commentaires de colonnes. Le dictionnaire rédigé dans
 * `schema.prisma` finit donc lisible dans l'entrepôt, sans être recopié nulle part.
 *
 * La résolution des types est partagée avec l'OpenAPI (`resoudreColonnes`) : deux contrats
 * publiés décrivant les mêmes colonnes depuis deux codes différents finiraient par diverger.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseSchemaDoc, parseEnums } from './schema-doc'
import { allDescriptors } from './descriptor'
import { allFullTableDescriptors } from './full-table-descriptor'
import { resoudreColonnes, resoudreColonnesFullTable } from './openapi'

export interface TapStreamManifest {
  /** Nom du flux Singer — identique au segment d'URL et au nom de table dans l'entrepôt. */
  name: string
  path: string
  primary_keys: string[]
  /** Absent pour un flux FULL_TABLE (GUIC-700 lot 7) — aucun watermark disponible. */
  replication_key?: string
  replication_method: 'INCREMENTAL' | 'FULL_TABLE'
  schema: {
    type: 'object'
    properties: Record<string, unknown>
  }
}

export interface TapManifest {
  /** Version du contrat. Un consommateur qui la voit changer doit relire le catalogue. */
  contract_version: string
  streams: TapStreamManifest[]
}

/**
 * Traduit des colonnes résolues (partagées avec l'OpenAPI) en propriétés JSON Schema
 * Singer.
 *
 * `type` et `enum` sont deux contraintes INDÉPENDANTES en JSON Schema : une colonne
 * nullable dont l'énumération omet `null` refuse toute valeur absente, que le type
 * autorise pourtant. Le chargeur Singer valide chaque enregistrement et interrompt le run
 * au premier refus — une offre sans niveau d'études minimum a suffi (GUIC-693).
 */
function construireProperties(
  resolues: Record<string, { type: string | string[]; format?: string; enum?: string[]; description: string; tier: string }>
): Record<string, unknown> {
  const properties: Record<string, unknown> = {}
  for (const [nom, colonne] of Object.entries(resolues)) {
    // Singer attend toujours un tableau de types : la nullabilité y est portée par le
    // type lui-même, pas par un drapeau séparé.
    const types = Array.isArray(colonne.type) ? colonne.type : [colonne.type]
    const enumere: (string | null)[] | undefined = colonne.enum
    const valeurs =
      enumere && types.includes('null') && !enumere.includes(null)
        ? [...enumere, null]
        : enumere
    properties[nom] = {
      type: types,
      ...(colonne.format ? { format: colonne.format } : {}),
      ...(valeurs ? { enum: valeurs } : {}),
      description: colonne.description,
      'x-cjs-tier': colonne.tier,
    }
  }
  return properties
}

export function buildTapManifest(schemaPath?: string): TapManifest {
  const source = readFileSync(schemaPath ?? join(process.cwd(), 'prisma', 'schema.prisma'), 'utf8')
  const models = parseSchemaDoc(source)
  const enums = parseEnums(source)

  const streams = allDescriptors().map((descriptor) => {
    const model = models.find((m) => m.model === descriptor.model)
    if (!model) throw new Error(`modèle absent du schéma : ${descriptor.model}`)

    const properties = construireProperties(resoudreColonnes(descriptor, model.fields, enums))

    // Le nom EXPORTÉ de la clé, pas le nom Prisma : le tap ne connaît que la forme servie.
    const cleExportee = (field: string): string =>
      descriptor.columns.find((c) => c.field === field)?.as ?? field

    return {
      name: descriptor.name,
      path: `/api/v1/export/${descriptor.name}`,
      primary_keys: [cleExportee(descriptor.primaryKey)],
      replication_key: cleExportee(descriptor.replicationKey),
      replication_method: 'INCREMENTAL' as const,
      schema: { type: 'object' as const, properties },
    }
  })

  // GUIC-700 lot 7 — flux FULL_TABLE (jonctions programmes) : pas de replication_key,
  // clé composite exprimée sous ses deux noms exportés.
  const streamsFullTable = allFullTableDescriptors().map((descriptor) => {
    const model = models.find((m) => m.model === descriptor.model)
    if (!model) throw new Error(`modèle absent du schéma : ${descriptor.model}`)

    const properties = construireProperties(resoudreColonnesFullTable(descriptor, model.fields, enums))
    const cleExportee = (field: string): string =>
      descriptor.columns.find((c) => c.field === field)?.as ?? field

    return {
      name: descriptor.name,
      path: `/api/v1/export/${descriptor.name}`,
      primary_keys: descriptor.primaryKey.map(cleExportee),
      replication_method: 'FULL_TABLE' as const,
      schema: { type: 'object' as const, properties },
    }
  })

  return { contract_version: '2.0', streams: [...streams, ...streamsFullTable] }
}

/** Sérialisation stable — l'ordre des clés ne doit pas varier d'une génération à l'autre. */
export function renderTapManifest(schemaPath?: string): string {
  return `${JSON.stringify(buildTapManifest(schemaPath), null, 2)}\n`
}
