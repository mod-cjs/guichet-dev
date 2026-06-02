/**
 * Seed Tags — GUIC-182 (M3 v2 / 178a).
 *
 * 7 tags transversaux validés par PO/Lead (cf spec §18 Q4).
 * Évite la prolifération anarchique : nouveaux tags ajoutés via UI admin
 * en Phase 4.
 *
 * Idempotent via upsert sur le slug.
 */

import type { PrismaClient } from '@prisma/client'

interface TagSeed {
  slug: string
  libelle: string
}

export const TAGS_SEED: TagSeed[] = [
  { slug: 'urgent',             libelle: 'Urgent' },
  { slug: 'remote',             libelle: 'Télétravail' },
  { slug: 'diaspora',           libelle: 'Diaspora' },
  { slug: 'priorite-femmes',    libelle: 'Priorité femmes' },
  { slug: 'priorite-handicap',  libelle: 'Priorité handicap' },
  { slug: 'priorite-rural',     libelle: 'Priorité rural' },
  { slug: 'nouveau',            libelle: 'Nouveau' },
]

export async function seedTags(prisma: PrismaClient): Promise<number> {
  for (const t of TAGS_SEED) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      update: { libelle: t.libelle },
      create: { slug: t.slug, libelle: t.libelle },
    })
  }
  return TAGS_SEED.length
}
