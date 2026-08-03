/**
 * M13 / Data Hub — descripteurs d'extraction dérivés du contrat (lot 3, spec §7).
 *
 * La spec prévoyait un fichier de descripteurs GÉNÉRÉ depuis `streams.ts`. Le contrat
 * étant déjà du TypeScript, les dériver à l'exécution supprime un artefact à tenir
 * synchronisé — donc une source de dérive et une étape de CI. Le générateur reste
 * nécessaire pour ce qui quitte le dépôt (OpenAPI, schémas du tap, sources dbt), pas
 * pour ce qui y reste.
 *
 * Le descripteur est ce que consomme le socle d'extraction : sélection Prisma restreinte
 * aux colonnes du contrat, ordre de tri total, et projection d'une ligne vers sa forme
 * exportée.
 *
 * NOTE SUR LES TIERS — le contrat porte un `tier` par colonne, mais aucun filtrage n'est
 * appliqué ici : l'arbitrage retenu (spec §6.3) ne prévoit qu'un seul consommateur, le tap
 * Meltano, habilité aux deux niveaux. Le `tier` reste une métadonnée de gouvernance, qui
 * descend jusqu'aux sources dbt. Filtrer aujourd'hui serait du code mort — et du code mort
 * sur un chemin de confidentialité est pire qu'inutile : il donne l'illusion d'un contrôle
 * que personne n'exerce.
 */
import { streams, type StreamName } from './streams'
import type { AnyStreamDefinition, Tier } from './stream-types'

export interface ExportColumn {
  /** Nom du champ Prisma — ce qu'on sélectionne. */
  field: string
  /** Nom de la colonne dans l'entrepôt — ce qu'on émet. */
  as: string
  tier: Tier
  transform?: (value: unknown) => unknown
}

export interface StreamDescriptor {
  name: string
  model: AnyStreamDefinition['model']
  primaryKey: string
  replicationKey: string
  softDelete?: string
  columns: ExportColumn[]
  /** `select` Prisma — restreint au contrat, jamais un `findMany` nu. */
  select: Record<string, true>
  /** Tri total `(watermark, clé primaire)` : la correction du curseur en dépend. */
  orderBy: Array<Record<string, 'asc'>>
}

type FieldSpecShape = { as: string; tier: Tier; transform?: (value: never) => unknown }

export function describeStream(name: string, def: AnyStreamDefinition): StreamDescriptor {
  const specs = def.fields as Record<string, FieldSpecShape>

  const columns: ExportColumn[] = Object.entries(specs).map(([field, spec]) => ({
    field,
    as: spec.as,
    tier: spec.tier,
    transform: spec.transform as ((value: unknown) => unknown) | undefined,
  }))

  const select: Record<string, true> = {}
  for (const column of columns) select[column.field] = true

  return {
    name,
    model: def.model,
    primaryKey: def.primaryKey,
    replicationKey: def.replicationKey,
    softDelete: def.softDelete,
    columns,
    select,
    orderBy: [{ [def.replicationKey]: 'asc' }, { [def.primaryKey]: 'asc' }],
  }
}

/**
 * Rend une valeur transportable en JSON.
 *
 * `BigInt` : `JSON.stringify` refuse de les sérialiser — `consultations.id` et
 * `centre_events.id` en sont. Ils sortent en chaîne, ce qui impose au curseur de les
 * comparer numériquement et non lexicographiquement (sinon « 9 » > « 10 » et l'extraction
 * saute des lignes).
 */
function serialize(value: unknown): unknown {
  if (value === null || value === undefined) return value
  if (typeof value === 'bigint') return value.toString()
  if (value instanceof Date) return value.toISOString()
  return value
}

/**
 * Projette une ligne Prisma vers sa forme exportée : transformation, renommage,
 * sérialisation. Une colonne absente de la ligne ne produit pas de clé — l'appelant
 * décide de ce qu'il sélectionne, la projection ne comble pas les trous.
 */
export function projectRow(
  descriptor: StreamDescriptor,
  row: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const column of descriptor.columns) {
    if (!(column.field in row)) continue
    const raw = row[column.field]
    out[column.as] = serialize(column.transform ? column.transform(raw) : raw)
  }
  return out
}

/** Tous les flux du contrat, sous forme de descripteurs. */
export function allDescriptors(): StreamDescriptor[] {
  return Object.entries(streams).map(([name, def]) =>
    describeStream(name, def as AnyStreamDefinition)
  )
}

/** Descripteur d'un flux nommé, ou `null` si le nom n'est pas au contrat. */
export function descriptorFor(name: string): StreamDescriptor | null {
  if (!Object.hasOwn(streams, name)) return null
  return describeStream(name, streams[name as StreamName] as AnyStreamDefinition)
}
