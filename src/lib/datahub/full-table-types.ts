// M13 / Data Hub — stub RED (GUIC-700 lot 7) : signatures posées, comportement pas encore correct.
import type { ModelName, ScalarField, FieldSpec } from './stream-types'

export interface FullTableSpec<M extends ModelName> {
  primaryKey: [ScalarField<M>, ScalarField<M>]
  fields: { [K in ScalarField<M>]?: FieldSpec<M, K> }
}

export interface FullTableDefinition<M extends ModelName = ModelName> extends FullTableSpec<M> {
  model: M
}

export type AnyFullTableDefinition = { [M in ModelName]: FullTableDefinition<M> }[ModelName]

export function defineFullTableStream<M extends ModelName>(
  model: M,
  spec: FullTableSpec<M>
): FullTableDefinition<M> {
  return { model, ...spec }
}
