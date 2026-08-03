// M13 / Data Hub — stub RED (GUIC-700 lot 7) : signatures posées, comportement pas encore correct.
import type { StreamDescriptor } from './descriptor'

export interface KeySource {
  keys(model: string, primaryKey: string): Promise<string[]>
}

export interface WarehouseKeys {
  keys(table: string, column: string): Promise<string[]>
  deleteMany(table: string, column: string, absentes: string[]): Promise<number>
}

export interface PurgeRow {
  stream: string
  supprimees: number | null
  erreur?: string
}

export async function purgeAbsents(
  descriptors: StreamDescriptor[],
  source: KeySource,
  entrepot: WarehouseKeys
): Promise<PurgeRow[]> {
  return descriptors.map((d) => ({ stream: d.name, supprimees: 0 }))
}
