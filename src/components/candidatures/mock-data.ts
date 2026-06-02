import type { CandidatureMock } from './types'

/**
 * Mock de 6 candidatures couvrant les 5 étapes du pipeline + une décision
 * refusée. Source de vérité tant que la table `Candidature` Prisma n'a pas
 * été étendue (4 statuts actuels vs 5 étapes UI — cf. types.ts).
 *
 * TODO Phase 4 (GUIC-190 suite) : remplacer par `getCandidatures(userId)`
 * dans `src/lib/loaders/candidatures.ts` une fois le schéma migré.
 */
export const CANDIDATURES_MOCK: CandidatureMock[] = [
  {
    id: 'cand-001',
    opportuniteSlug: 'bourse-agricole-maraichage',
    opportuniteTitre: 'Bourse agricole — maraîchage',
    organisation: 'YEAH Sénégal',
    type: 'Bourse',
    currentStep: 'Brouillon',
    decision: null,
    envoyeeA: '2026-05-28T09:00:00.000Z',
  },
  {
    id: 'cand-002',
    opportuniteSlug: 'stage-data-sonatel',
    opportuniteTitre: 'Stage Data — Sonatel',
    organisation: 'Sonatel',
    type: 'Stage',
    currentStep: 'Envoyee',
    decision: null,
    envoyeeA: '2026-05-30T14:30:00.000Z',
  },
  {
    id: 'cand-003',
    opportuniteSlug: 'concours-jeunes-entrepreneurs',
    opportuniteTitre: 'Concours Jeunes Entrepreneurs',
    organisation: 'CDC',
    type: 'Concours',
    currentStep: 'EnRevue',
    decision: null,
    envoyeeA: '2026-05-15T10:00:00.000Z',
  },
  {
    id: 'cand-004',
    opportuniteSlug: 'assistante-rh-cabinet-karim',
    opportuniteTitre: 'Assistante RH — Cabinet Karim&Co',
    organisation: 'Cabinet Karim&Co',
    type: 'Emploi',
    currentStep: 'Entretien',
    decision: null,
    envoyeeA: '2026-05-10T08:00:00.000Z',
  },
  {
    id: 'cand-005',
    opportuniteSlug: 'bourse-mobilite-ucad',
    opportuniteTitre: 'Bourse mobilité — UCAD',
    organisation: 'UCAD',
    type: 'Bourse',
    currentStep: 'Decision',
    decision: 'Acceptee',
    envoyeeA: '2026-04-20T08:00:00.000Z',
  },
  {
    id: 'cand-006',
    opportuniteSlug: 'formation-comptabilite',
    opportuniteTitre: 'Formation comptabilité',
    organisation: 'CJS Tambacounda',
    type: 'Formation',
    currentStep: 'Decision',
    decision: 'Refusee',
    envoyeeA: '2026-04-05T08:00:00.000Z',
  },
]
