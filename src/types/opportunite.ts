import type { Domaine, Region, TypeOpportunite } from '@prisma/client'

/** Tri supporté par le catalogue public. */
export type OpportuniteSortBy = 'recent' | 'deadline'

/** Champs d'une opportunité affichés sur une carte de liste (GUIC-20). */
export interface OpportuniteListItem {
  id: string
  slug: string
  titre: string
  type: TypeOpportunite
  domaine: Domaine
  region: Region | null
  organisation: string
  remuneration: string | null
  deadline: string | null // ISO 8601
}

/**
 * Filtres normalisés consommés par le loader.
 *
 * GUIC-256 : `type` / `domaine` / `region` acceptent un tableau (multi-select)
 * OU une valeur unique (rétro-compat). Le loader normalise toujours en tableau
 * pour la requête `IN (...)`.
 */
export interface OpportuniteFiltres {
  q?: string
  domaine?: Domaine | Domaine[]
  type?: TypeOpportunite | TypeOpportunite[]
  region?: Region | Region[]
  page: number
  sortBy: OpportuniteSortBy
}

/** Résultat paginé du catalogue. */
export interface OpportuniteListResult {
  items: OpportuniteListItem[]
  total: number
  page: number
  pageSize: number
}
