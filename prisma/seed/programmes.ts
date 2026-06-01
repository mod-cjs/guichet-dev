/**
 * Seed Programmes sectoriels CJS — GUIC-182 (M3 v2 / 178a).
 *
 * 4 programmes : Yaakaar, YEAH, YJC, EduPop.
 * BRM = outil interne, EXCLU (décision Lead 2026-05-29, cf cleanup GUIC-176).
 *
 * Idempotent via upsert sur le slug.
 */

import type { PrismaClient } from '@prisma/client'

interface ProgrammeSeed {
  slug: string
  nom: string
  description: string
  gradientToken: string
}

export const PROGRAMMES_SEED: ProgrammeSeed[] = [
  {
    slug: 'yaakaar',
    nom: 'Yaakaar',
    description: 'Programme entrepreneuriat et auto-emploi du Consortium Jeunesse Sénégal.',
    gradientToken: 'var(--prog-yaakaar)',
  },
  {
    slug: 'yeah',
    nom: 'YEAH',
    description: 'Youth Empowerment for African Health — santé jeune.',
    gradientToken: 'var(--prog-yeah)',
  },
  {
    slug: 'yjc',
    nom: 'YJC',
    description: 'Youth Job Connect — accès à l\'emploi et au stage pour les jeunes.',
    gradientToken: 'var(--prog-yjc)',
  },
  {
    slug: 'edupop',
    nom: 'EduPop',
    description: 'Éducation populaire — formations courtes et ateliers communautaires.',
    gradientToken: 'var(--prog-edupop)',
  },
]

export async function seedProgrammes(prisma: PrismaClient): Promise<number> {
  for (const p of PROGRAMMES_SEED) {
    await prisma.programme.upsert({
      where: { slug: p.slug },
      update: {
        nom: p.nom,
        description: p.description,
        gradientToken: p.gradientToken,
      },
      create: {
        slug: p.slug,
        nom: p.nom,
        description: p.description,
        gradientToken: p.gradientToken,
      },
    })
  }
  return PROGRAMMES_SEED.length
}
