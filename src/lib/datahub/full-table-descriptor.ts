/**
 * M13 / Data Hub — descripteurs FULL_TABLE (lot 7, spec §5).
 *
 * Parallèle à `descriptor.ts`, pas une extension : ces flux n'ont pas de `replicationKey`
 * ni de clé primaire simple, la sélection et le tri s'en trouvent structurellement
 * différents (tri sur la clé COMPOSITE entière, pas sur un couple watermark/pk).
 */
import { fullTableStreams } from './full-table-streams'
import type { AnyFullTableDefinition } from './full-table-types'
import type { Tier } from './stream-types'

export interface FullTableColumn {
  /** Nom du champ Prisma — ce qu'on sélectionne. */
  field: string
  /** Nom de la colonne dans l'entrepôt — ce qu'on émet. */
  as: string
  tier: Tier
}

export interface FullTableDescriptor {
  name: string
  model: AnyFullTableDefinition['model']
  /** Clé composite — noms Prisma, dans l'ordre qui fixe le tri. */
  primaryKey: [string, string]
  columns: FullTableColumn[]
  select: Record<string, true>
  orderBy: Array<Record<string, 'asc'>>
}

export function describeFullTableStream(
  name: string,
  def: AnyFullTableDefinition
): FullTableDescriptor {
  const specs = def.fields as Record<string, { as: string; tier: Tier }>

  const columns: FullTableColumn[] = Object.entries(specs).map(([field, spec]) => ({
    field,
    as: spec.as,
    tier: spec.tier,
  }))

  const select: Record<string, true> = {}
  for (const column of columns) select[column.field] = true

  return {
    name,
    model: def.model,
    primaryKey: def.primaryKey,
    columns,
    select,
    orderBy: def.primaryKey.map((champ) => ({ [champ]: 'asc' as const })),
  }
}

export function allFullTableDescriptors(): FullTableDescriptor[] {
  return Object.entries(fullTableStreams).map(([name, def]) =>
    describeFullTableStream(name, def as AnyFullTableDefinition)
  )
}

export function fullTableDescriptorFor(name: string): FullTableDescriptor | null {
  if (!Object.hasOwn(fullTableStreams, name)) return null
  return describeFullTableStream(
    name,
    fullTableStreams[name as keyof typeof fullTableStreams] as AnyFullTableDefinition
  )
}

/** Projette une ligne Prisma vers sa forme exportée : renommage, pas de transformation. */
export function projectFullTableRow(
  descriptor: FullTableDescriptor,
  row: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const column of descriptor.columns) {
    if (!(column.field in row)) continue
    out[column.as] = row[column.field]
  }
  return out
}
