// M13 / Data Hub — stub RED (GUIC-696 R1) : signature posée, comportement pas encore correct.
import type { StreamDescriptor } from './descriptor'
import type { ModelDoc } from './schema-doc'

export interface ColonneDate {
  stream: string
  table: string
  column: string
}

export function colonnesDateExportees(
  descriptors: StreamDescriptor[],
  models: ModelDoc[]
): ColonneDate[] {
  return descriptors
    .map((d) => {
      const model = models.find((m) => m.model === d.model)
      return model
        ? { stream: d.name, table: model.table, column: d.replicationKey }
        : null
    })
    .filter((c): c is ColonneDate => c !== null)
}
