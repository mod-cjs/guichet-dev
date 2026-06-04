import { prisma } from '@/lib/prisma'
import type { StatutCandidature, TypeOpportunite } from '@prisma/client'
import type { CandidatureMock, PipelineStep, CandidatureDecision } from '@/components/candidatures/types'

/**
 * Charge les candidatures du jeune connecté pour `/jeune/mes-candidatures`
 * (GUIC-237). Server-side : remplace `CANDIDATURES_MOCK` posé pendant GUIC-190.
 *
 * Mapping `StatutCandidature` (Prisma, 4 valeurs) → `PipelineStep` UI :
 *   - En_attente → 'Envoyee'  (candidature soumise, pas encore vue)
 *   - Vue        → 'EnRevue'  (le recruteur a ouvert le dossier)
 *   - Retenue    → 'Decision' / decision='Acceptee'
 *   - Refusee    → 'Decision' / decision='Refusee'
 *
 * Étapes UI 'Brouillon' et 'Entretien' restent visibles dans le stepper mais
 * jamais positionnées comme `currentStep` tant que l'enum Prisma n'est pas
 * étendu (out of scope, suivi via ticket d'évolution schéma).
 */

const TYPE_LABEL: Record<TypeOpportunite, CandidatureMock['type']> = {
  Stage: 'Stage',
  Bourse: 'Bourse',
  Emploi: 'Emploi',
  Formation: 'Formation',
  Volontariat: 'Volontariat',
  Appel_a_projets: 'Appel à projets',
}

interface StatutMapping {
  currentStep: PipelineStep
  decision: CandidatureDecision
}

export const STATUT_TO_STEP: Record<StatutCandidature, StatutMapping> = {
  En_attente: { currentStep: 'Envoyee', decision: null },
  Vue: { currentStep: 'EnRevue', decision: null },
  Retenue: { currentStep: 'Decision', decision: 'Acceptee' },
  Refusee: { currentStep: 'Decision', decision: 'Refusee' },
}

export async function loadMesCandidatures(cjsUid: string): Promise<CandidatureMock[]> {
  const rows = await prisma.candidature.findMany({
    where: { cjsUid },
    orderBy: { soumiseA: 'desc' },
    select: {
      id: true,
      statut: true,
      soumiseA: true,
      opportunite: {
        select: { slug: true, titre: true, organisation: true, type: true },
      },
    },
  })

  return rows.map((c) => {
    const mapping = STATUT_TO_STEP[c.statut]
    return {
      id: c.id,
      opportuniteSlug: c.opportunite.slug,
      opportuniteTitre: c.opportunite.titre,
      organisation: c.opportunite.organisation,
      type: TYPE_LABEL[c.opportunite.type],
      currentStep: mapping.currentStep,
      decision: mapping.decision,
      envoyeeA: c.soumiseA.toISOString(),
    }
  })
}
