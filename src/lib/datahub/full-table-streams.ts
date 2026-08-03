// M13 / Data Hub — stub RED (GUIC-700 lot 7) : signatures posées, comportement pas encore correct.
import { defineFullTableStream, type AnyFullTableDefinition } from './full-table-types'

export const fullTableStreams = {
  opportunites_programmes: defineFullTableStream('OpportuniteProgramme', {
    primaryKey: ['opportuniteId', 'programmeId'],
    fields: {
      opportuniteId: { as: 'opportunite_id', tier: 'pseudonyme' },
      programmeId: { as: 'programme_id', tier: 'pseudonyme' },
      principal: { as: 'principal', tier: 'public' },
    },
  }),
} satisfies Record<string, AnyFullTableDefinition>

export type FullTableStreamName = keyof typeof fullTableStreams
