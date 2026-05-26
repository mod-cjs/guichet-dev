import type { Domaine, Region, StatutCandidature, TypeOpportunite } from '@prisma/client'

/** Détail public d'une opportunité (page / slide-over GUIC-21). */
export interface OpportuniteDetail {
  id: string
  slug: string
  titre: string
  description: string
  type: TypeOpportunite
  domaine: Domaine
  region: Region | null
  organisation: string
  remuneration: string | null
  deadline: string | null // ISO 8601
  lienExterne: string | null
  vues: number
}

/** Ligne de la section « Mes candidatures ». */
export interface CandidatureListItem {
  id: string
  opportuniteSlug: string
  opportuniteTitre: string
  organisation: string
  statut: StatutCandidature
  soumiseA: string // ISO 8601
}
