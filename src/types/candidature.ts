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

/**
 * Métadonnées d'un CV uploadé (Vercel Blob / S3) partagées entre la
 * réponse d'upload, le formulaire candidature et l'appel API.
 *
 * GUIC-217 (Wave 6) — source unique de vérité pour les sous-PRs
 * GUIC-218/219/220.
 */
export interface CvBlobMeta {
  /** URL publique (ou présignée) du CV stocké. */
  url: string
  /** Nom de fichier sanitizé (`a-z0-9._-`, espaces remplacés). */
  name: string
  /** Taille en kilo-octets, arrondie à l'entier. */
  sizeKb: number
}
