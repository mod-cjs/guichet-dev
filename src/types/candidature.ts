import type { StatutCandidature } from '@prisma/client'
import type { OpportuniteDetailDTO } from '@/lib/opportunites/dto'

/**
 * Détail public d'une opportunité (page / slide-over GUIC-21).
 *
 * GUIC-184 (178c/4) — alias structurel sur `OpportuniteDetailDTO` : le contrat des
 * champs racine (id, slug, titre, description, type, domaine, region, organisation,
 * remuneration, deadline, lienExterne, vues) est strictement préservé. Les champs
 * additifs (`programme`, `details`, `actionLabel`, `requiresFileUpload`, `skills`,
 * `tags`, `typeSlug`, `fileLabel`, `statut`) sont ignorés par les consommateurs
 * legacy mais disponibles pour les nouvelles pages (M3 v2 / Phase 2).
 */
export type OpportuniteDetail = OpportuniteDetailDTO

/** Ligne de la section « Mes candidatures ». */
export interface CandidatureListItem {
  id: string
  opportuniteSlug: string
  opportuniteTitre: string
  organisation: string
  statut: StatutCandidature
  soumiseA: string // ISO 8601
}
