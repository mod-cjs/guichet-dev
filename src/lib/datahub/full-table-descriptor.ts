// M13 / Data Hub — stub RED (GUIC-700 lot 7) : signatures posées, comportement pas encore correct.
import { fullTableStreams } from './full-table-streams'
import type { AnyFullTableDefinition } from './full-table-types'

export interface FullTableColumn {
  field: string
  as: string
}

export interface FullTableDescriptor {
  name: string
  model: AnyFullTableDefinition['model']
  primaryKey: [string, string]
  columns: FullTableColumn[]
  select: Record<string, true>
  orderBy: Array<Record<string, 'asc'>>
}

export function describeFullTableStream(
  name: string,
  def: AnyFullTableDefinition
): FullTableDescriptor {
  return {
    name,
    model: def.model,
    primaryKey: def.primaryKey,
    columns: [],
    select: {},
    orderBy: [],
  }
}

export function allFullTableDescriptors(): FullTableDescriptor[] {
  return []
}

export function fullTableDescriptorFor(name: string): FullTableDescriptor | null {
  return null
}

export function projectFullTableRow(
  descriptor: FullTableDescriptor,
  row: Record<string, unknown>
): Record<string, unknown> {
  return {}
}
