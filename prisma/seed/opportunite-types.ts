/**
 * Seed OpportuniteType — GUIC-182 (M3 v2 / 178a).
 *
 * 6 types polymorphes :
 *   emploi, stage, formation, bourse, concours, appel_a_projets
 *
 * Libellés FR + workflow validés par PO/Lead (cf spec §18 Q1).
 * Idempotent via upsert sur le slug.
 */

import type { PrismaClient } from '@prisma/client'

interface OpportuniteTypeSeed {
  slug: string
  libelle: string
  actionLabel: string
  requiresFileUpload: boolean
  fileLabel: string | null
  decisionAuthority: string | null
  ordre: number
}

export const OPPORTUNITE_TYPES_SEED: OpportuniteTypeSeed[] = [
  {
    slug: 'emploi',
    libelle: 'Emploi',
    actionLabel: 'Postuler',
    requiresFileUpload: true,
    fileLabel: 'CV (PDF)',
    decisionAuthority: 'recruteur',
    ordre: 1,
  },
  {
    slug: 'stage',
    libelle: 'Stage',
    actionLabel: 'Postuler',
    requiresFileUpload: true,
    fileLabel: 'CV (PDF)',
    decisionAuthority: 'recruteur',
    ordre: 2,
  },
  {
    slug: 'formation',
    libelle: 'Formation',
    actionLabel: 'S\'inscrire',
    requiresFileUpload: false,
    fileLabel: 'Justificatif niveau (optionnel)',
    decisionAuthority: 'auto',
    ordre: 3,
  },
  {
    slug: 'bourse',
    libelle: 'Bourse',
    actionLabel: 'Demander',
    requiresFileUpload: true,
    fileLabel: 'Justificatifs académiques',
    decisionAuthority: 'commission',
    ordre: 4,
  },
  {
    slug: 'concours',
    libelle: 'Concours',
    actionLabel: 'Participer',
    requiresFileUpload: true,
    fileLabel: 'Soumission (PDF/lien)',
    decisionAuthority: 'jury',
    ordre: 5,
  },
  {
    slug: 'appel_a_projets',
    libelle: 'Appel à projets',
    actionLabel: 'Déposer un dossier',
    requiresFileUpload: true,
    fileLabel: 'Note conceptuelle + budget',
    decisionAuthority: 'comite_financement',
    ordre: 6,
  },
]

export async function seedOpportuniteTypes(prisma: PrismaClient): Promise<number> {
  for (const t of OPPORTUNITE_TYPES_SEED) {
    await prisma.opportuniteType.upsert({
      where: { slug: t.slug },
      update: {
        libelle: t.libelle,
        actionLabel: t.actionLabel,
        requiresFileUpload: t.requiresFileUpload,
        fileLabel: t.fileLabel,
        decisionAuthority: t.decisionAuthority,
        ordre: t.ordre,
      },
      create: {
        slug: t.slug,
        libelle: t.libelle,
        actionLabel: t.actionLabel,
        requiresFileUpload: t.requiresFileUpload,
        fileLabel: t.fileLabel,
        decisionAuthority: t.decisionAuthority,
        ordre: t.ordre,
      },
    })
  }
  return OPPORTUNITE_TYPES_SEED.length
}
