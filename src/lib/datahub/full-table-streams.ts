/**
 * M13 / Data Hub — contrat FULL_TABLE des tables de jonction programmes (lot 7, spec §5).
 *
 * Comme `streams.ts`, ce fichier est un point de contrôle CDP : `opportuniteId` etc. sont
 * des clés de jointure (tier `pseudonyme`), `principal` est un simple booléen (tier
 * `public`). Aucune colonne interdite possible ici — les tables de jonction ne portent
 * que des clés étrangères et un drapeau.
 */
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

  ressources_programmes: defineFullTableStream('RessourceProgramme', {
    primaryKey: ['ressourceId', 'programmeId'],
    fields: {
      ressourceId: { as: 'ressource_id', tier: 'pseudonyme' },
      programmeId: { as: 'programme_id', tier: 'pseudonyme' },
      principal: { as: 'principal', tier: 'public' },
    },
  }),

  evenements_programmes: defineFullTableStream('EvenementProgramme', {
    primaryKey: ['evenementId', 'programmeId'],
    fields: {
      evenementId: { as: 'evenement_id', tier: 'pseudonyme' },
      programmeId: { as: 'programme_id', tier: 'pseudonyme' },
      principal: { as: 'principal', tier: 'public' },
    },
  }),

  centres_programmes: defineFullTableStream('CentreProgramme', {
    primaryKey: ['centreId', 'programmeId'],
    fields: {
      centreId: { as: 'centre_id', tier: 'pseudonyme' },
      programmeId: { as: 'programme_id', tier: 'pseudonyme' },
      principal: { as: 'principal', tier: 'public' },
    },
  }),

  organisations_programmes: defineFullTableStream('OrganisationProgramme', {
    primaryKey: ['organisationId', 'programmeId'],
    fields: {
      organisationId: { as: 'organisation_id', tier: 'pseudonyme' },
      programmeId: { as: 'programme_id', tier: 'pseudonyme' },
      principal: { as: 'principal', tier: 'public' },
    },
  }),
} satisfies Record<string, AnyFullTableDefinition>

export type FullTableStreamName = keyof typeof fullTableStreams
