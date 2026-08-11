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

/**
 * GUIC-689 (É-14) — Regroupement des candidatures PAR INTENTION.
 *
 * Les cinq étapes du pipeline sont notre vocabulaire interne : « En revue »,
 * « Décision » ne disent rien à un jeune de 22 ans. La v5 regroupe par ce que
 * la personne peut en faire.
 *
 * « Brouillons » reste à part, contrairement aux quatre groupes v5 : un
 * brouillon n'est pas une candidature en cours, c'est une candidature à finir
 * d'écrire — la seule catégorie où le jeune a une action à mener. La noyer dans
 * « En cours » la rendrait invisible.
 */
export type CandidatureGroupe = 'all' | 'Brouillons' | 'EnCours' | 'Entretiens' | 'Cloturees'

export const GROUPE_LABELS: Record<CandidatureGroupe, string> = {
  all: 'Toutes',
  Brouillons: 'Brouillons',
  EnCours: 'En cours',
  Entretiens: 'Entretiens',
  Cloturees: 'Clôturées',
}

/**
 * Étape du pipeline → groupe affiché.
 *
 * `Decision` couvre aussi bien une décision du recruteur qu'un RETRAIT par le
 * candidat (GUIC-689) : « Clôturées » convient aux deux, là où « Décision »
 * annonçait à tort une décision qui n'avait pas eu lieu.
 */
export function groupeDeLEtape(step: PipelineStep): Exclude<CandidatureGroupe, 'all'> {
  switch (step) {
    case 'Brouillon':
      return 'Brouillons'
    case 'Envoyee':
    case 'EnRevue':
      return 'EnCours'
    case 'Entretien':
      return 'Entretiens'
    case 'Decision':
      return 'Cloturees'
  }
}
