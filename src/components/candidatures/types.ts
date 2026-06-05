/**
 * Types front pour le pipeline candidatures (GUIC-190, Phase 2B/4).
 *
 * TODO Phase 4 : aligner le schéma Prisma `StatutCandidature`
 * (actuellement : En_attente | Vue | Retenue | Refusee) sur les 5 étapes
 * fonctionnelles produit ci-dessous. Pour l'instant, l'UI travaille sur des
 * données mock ; le mapping sera fait lors de la création du loader réel.
 */

export const PIPELINE_STEPS = [
  'Brouillon',
  'Envoyee',
  'EnRevue',
  'Entretien',
  'Decision',
] as const

export type PipelineStep = (typeof PIPELINE_STEPS)[number]

export type CandidatureDecision = 'Acceptee' | 'Refusee' | null

export interface CandidatureMock {
  id: string
  opportuniteSlug: string
  opportuniteTitre: string
  organisation: string
  type: 'Stage' | 'Bourse' | 'Concours' | 'Emploi' | 'Formation' | 'Volontariat' | 'Appel à projets'
  /** Étape courante dans le pipeline. */
  currentStep: PipelineStep
  /** Décision finale, uniquement si `currentStep === 'Decision'`. */
  decision: CandidatureDecision
  /** ISO 8601 — soumission ou dernière mise à jour. */
  envoyeeA: string | null
}

/** Filtre haut de page. */
export type CandidatureFilter =
  | 'all'
  | PipelineStep

export const FILTER_LABELS: Record<CandidatureFilter, string> = {
  all: 'Toutes',
  Brouillon: 'Brouillon',
  Envoyee: 'Envoyée',
  EnRevue: 'En revue',
  Entretien: 'Entretien',
  Decision: 'Décision',
}

export const STEP_LABELS: Record<PipelineStep, string> = {
  Brouillon: 'Brouillon',
  Envoyee: 'Envoyée',
  EnRevue: 'En revue',
  Entretien: 'Entretien',
  Decision: 'Décision',
}
