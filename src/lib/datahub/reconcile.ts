// M13 / Data Hub — stub RED (GUIC-697 lot 5) : signatures posées, comportement pas encore correct.
import type { StreamDescriptor } from './descriptor'

export interface CountSource {
  count(model: string, field: string, since: Date): Promise<number>
}

export interface WarehouseSource {
  count(table: string, column: string, since: Date): Promise<number>
}

export interface ReconcileRow {
  stream: string
  source: number
  entrepot: number
  ecart: number | null
  erreur?: string
}

export async function reconcile(
  descriptors: StreamDescriptor[],
  since: Date,
  source: CountSource,
  entrepot: WarehouseSource
): Promise<ReconcileRow[]> {
  return descriptors.map((d) => ({ stream: d.name, source: 0, entrepot: 0, ecart: 0 }))
}
