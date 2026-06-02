/**
 * Seed Skills — GUIC-182 (M3 v2 / 178a).
 *
 * ~38 compétences couvrant 8 catégories pour les programmes CJS
 * (YJC, Yaakaar, EduPop, YEAH). Liste indicative à co-construire avec
 * le PO en Phase 2/3 ; les admins pourront étendre via UI ultérieurement.
 *
 * Catégories :
 *   - bureautique, linguistique, communication, gestion,
 *     metier_manuel, agriculture, digital, vente_services
 *
 * Idempotent via upsert sur le slug.
 */

import type { PrismaClient } from '@prisma/client'

interface SkillSeed {
  slug: string
  libelle: string
  categorie: string
}

export const SKILLS_SEED: SkillSeed[] = [
  // bureautique
  { slug: 'excel',                 libelle: 'Excel',                            categorie: 'bureautique' },
  { slug: 'word',                  libelle: 'Word',                             categorie: 'bureautique' },
  { slug: 'powerpoint',            libelle: 'PowerPoint',                       categorie: 'bureautique' },
  { slug: 'saisie-informatique',   libelle: 'Saisie informatique',              categorie: 'bureautique' },

  // linguistique
  { slug: 'francais',              libelle: 'Français',                         categorie: 'linguistique' },
  { slug: 'anglais',               libelle: 'Anglais',                          categorie: 'linguistique' },
  { slug: 'wolof',                 libelle: 'Wolof',                            categorie: 'linguistique' },
  { slug: 'pulaar',                libelle: 'Pulaar',                           categorie: 'linguistique' },
  { slug: 'sereer',                libelle: 'Sereer',                           categorie: 'linguistique' },

  // communication
  { slug: 'communication-orale',   libelle: 'Communication orale',              categorie: 'communication' },
  { slug: 'communication-ecrite',  libelle: 'Communication écrite',             categorie: 'communication' },
  { slug: 'presentation',          libelle: 'Présentation',                     categorie: 'communication' },
  { slug: 'marketing-digital',     libelle: 'Marketing digital',                categorie: 'communication' },

  // gestion
  { slug: 'gestion-projet',        libelle: 'Gestion projet',                   categorie: 'gestion' },
  { slug: 'comptabilite',          libelle: 'Comptabilité',                     categorie: 'gestion' },
  { slug: 'budgetisation',         libelle: 'Budgétisation',                    categorie: 'gestion' },
  { slug: 'leadership',            libelle: 'Leadership',                       categorie: 'gestion' },

  // metier_manuel
  { slug: 'couture',               libelle: 'Couture',                          categorie: 'metier_manuel' },
  { slug: 'maroquinerie',          libelle: 'Maroquinerie',                     categorie: 'metier_manuel' },
  { slug: 'soudure',               libelle: 'Soudure',                          categorie: 'metier_manuel' },
  { slug: 'mecanique',             libelle: 'Mécanique',                        categorie: 'metier_manuel' },
  { slug: 'electricite',           libelle: 'Électricité',                      categorie: 'metier_manuel' },
  { slug: 'plomberie',             libelle: 'Plomberie',                        categorie: 'metier_manuel' },

  // agriculture
  { slug: 'maraichage',            libelle: 'Maraîchage',                       categorie: 'agriculture' },
  { slug: 'elevage',               libelle: 'Élevage',                          categorie: 'agriculture' },
  { slug: 'aviculture',            libelle: 'Aviculture',                       categorie: 'agriculture' },
  { slug: 'aquaculture',           libelle: 'Aquaculture',                      categorie: 'agriculture' },
  { slug: 'transformation-agro',   libelle: 'Transformation agroalimentaire',   categorie: 'agriculture' },

  // digital
  { slug: 'prog-web',              libelle: 'Programmation web',                categorie: 'digital' },
  { slug: 'prog-mobile',           libelle: 'Programmation mobile',             categorie: 'digital' },
  { slug: 'design-graphique',      libelle: 'Design graphique',                 categorie: 'digital' },
  { slug: 'photographie',          libelle: 'Photographie',                     categorie: 'digital' },
  { slug: 'video',                 libelle: 'Vidéo',                            categorie: 'digital' },

  // vente_services
  { slug: 'vente',                 libelle: 'Vente',                            categorie: 'vente_services' },
  { slug: 'service-client',        libelle: 'Service client',                   categorie: 'vente_services' },
  { slug: 'restauration',          libelle: 'Restauration',                     categorie: 'vente_services' },
  { slug: 'tourisme',              libelle: 'Tourisme',                         categorie: 'vente_services' },
]

export async function seedSkills(prisma: PrismaClient): Promise<number> {
  for (const s of SKILLS_SEED) {
    await prisma.skill.upsert({
      where: { slug: s.slug },
      update: { libelle: s.libelle, categorie: s.categorie },
      create: { slug: s.slug, libelle: s.libelle, categorie: s.categorie },
    })
  }
  return SKILLS_SEED.length
}
