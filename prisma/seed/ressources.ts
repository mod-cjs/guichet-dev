/**
 * Seed Ressources — GUIC-239 (M6).
 *
 * 20 ressources réalistes pour les jeunes sénégalais. Catégories couvertes :
 * Emploi, Entrepreneuriat, Formation, Soft skills, Financements.
 * Types couverts : PDF, Video, Lien, Guide, Outil.
 *
 * Le modèle `Ressource` n'a pas de slug unique en base ; l'idempotence est
 * assurée via `drupalNid` avec des sentinelles négatives (-900000 + index)
 * réservées aux fixtures de seed (jamais utilisées par la migration Drupal).
 */

import type { PrismaClient, TypeRessource } from '@prisma/client'

interface RessourceSeed {
  /** Sentinelle de seed (négatif, jamais collision avec un vrai NID Drupal). */
  seedNid: number
  titre: string
  description: string
  type: TypeRessource
  theme: string
  url: string
}

const SEED_NID_BASE = -900000

export const RESSOURCES_SEED: RessourceSeed[] = [
  // — Emploi —
  {
    seedNid: 1,
    titre: 'Guide pour rédiger un CV efficace',
    description:
      'Modèle commenté et bonnes pratiques pour rédiger un CV adapté au marché sénégalais : structure, mots-clés, photo, fautes à éviter.',
    type: 'PDF',
    theme: 'Emploi',
    url: 'https://ressources.cjs.sn/emploi/guide-cv-efficace.pdf',
  },
  {
    seedNid: 2,
    titre: 'Modèle de lettre de motivation',
    description:
      'Lettre type personnalisable (Word + PDF) avec exemples pour candidature spontanée, réponse à offre et stage.',
    type: 'PDF',
    theme: 'Emploi',
    url: 'https://ressources.cjs.sn/emploi/modele-lettre-motivation.pdf',
  },
  {
    seedNid: 3,
    titre: "Préparer un entretien d'embauche",
    description:
      'Vidéo pédagogique de 12 min : questions classiques, langage corporel, négociation salariale et erreurs à éviter.',
    type: 'Video',
    theme: 'Emploi',
    url: 'https://video.cjs.sn/emploi/entretien-embauche',
  },
  {
    seedNid: 4,
    titre: 'Networking digital LinkedIn',
    description:
      'Optimiser son profil LinkedIn, écrire des messages de prise de contact et activer son réseau pour décrocher un emploi.',
    type: 'Video',
    theme: 'Emploi',
    url: 'https://video.cjs.sn/emploi/networking-linkedin',
  },
  {
    seedNid: 5,
    titre: 'Réussir son premier emploi — témoignage Sonatel',
    description:
      "Trois jeunes diplômés racontent leurs débuts en entreprise chez Sonatel : intégration, posture pro, gestion de la pression.",
    type: 'Video',
    theme: 'Emploi',
    url: 'https://video.cjs.sn/emploi/temoignage-sonatel',
  },
  {
    seedNid: 6,
    titre: 'Calculatrice salaire net Sénégal',
    description:
      'Outil en ligne pour estimer son salaire net à partir du brut (IR, IPRES, CSS) selon la grille en vigueur au Sénégal.',
    type: 'Outil',
    theme: 'Emploi',
    url: 'https://outils.cjs.sn/calculatrice-salaire-net',
  },

  // — Entrepreneuriat —
  {
    seedNid: 7,
    titre: 'Créer sa startup au Sénégal — guide ADEPME',
    description:
      'Démarches juridiques, fiscalité, incubateurs et financements disponibles pour lancer une startup au Sénégal.',
    type: 'PDF',
    theme: 'Entrepreneuriat',
    url: 'https://ressources.cjs.sn/entrepreneuriat/guide-creer-startup-adepme.pdf',
  },
  {
    seedNid: 8,
    titre: 'Démarches administratives jeunes entrepreneurs',
    description:
      "Récapitulatif des étapes APIX, NINEA, RCCM et inscriptions sociales pour formaliser son activité.",
    type: 'PDF',
    theme: 'Entrepreneuriat',
    url: 'https://ressources.cjs.sn/entrepreneuriat/demarches-admin-jeunes.pdf',
  },
  {
    seedNid: 9,
    titre: 'Wave & Orange Money pour entrepreneurs',
    description:
      "Comparatif des solutions de paiement mobile, frais, intégration site web, encaissement client et gestion de la trésorerie.",
    type: 'Lien',
    theme: 'Entrepreneuriat',
    url: 'https://blog.cjs.sn/entrepreneuriat/wave-orange-money',
  },
  {
    seedNid: 10,
    titre: 'Témoignages alumni YAAKAAR',
    description:
      "Cinq portraits vidéo de jeunes entrepreneurs accompagnés par le programme YAAKAAR : du pitch au premier client.",
    type: 'Video',
    theme: 'Entrepreneuriat',
    url: 'https://video.cjs.sn/entrepreneuriat/temoignages-yaakaar',
  },
  {
    seedNid: 11,
    titre: 'Modèle business plan simplifié',
    description:
      'Trame Word + Excel financier pour rédiger un business plan en 8 sections, adapté aux porteurs de projet débutants.',
    type: 'PDF',
    theme: 'Entrepreneuriat',
    url: 'https://ressources.cjs.sn/entrepreneuriat/business-plan-simplifie.pdf',
  },

  // — Formation —
  {
    seedNid: 12,
    titre: 'Initiation Excel niveau 1',
    description:
      'Cours vidéo de 6 modules : cellules, formules de base, tableaux croisés dynamiques, mise en page et impression.',
    type: 'Video',
    theme: 'Formation',
    url: 'https://video.cjs.sn/formation/initiation-excel-n1',
  },
  {
    seedNid: 13,
    titre: 'Initiation Python — premiers pas',
    description:
      "Parcours d'auto-formation gratuit en français : variables, boucles, fonctions, mini-projets en console.",
    type: 'Lien',
    theme: 'Formation',
    url: 'https://learn.cjs.sn/formation/python-debutant',
  },
  {
    seedNid: 14,
    titre: 'Bourses internationales étudiants africains',
    description:
      "Annuaire actualisé des bourses (DAAD, Eiffel, Mastercard Foundation, AIMS) : critères, calendriers et conseils de candidature.",
    type: 'Lien',
    theme: 'Formation',
    url: 'https://ressources.cjs.sn/formation/bourses-internationales',
  },
  {
    seedNid: 15,
    titre: 'Anglais professionnel intermédiaire',
    description:
      "Plateforme d'apprentissage de l'anglais professionnel : emails, réunions, vocabulaire métier, 30 leçons gratuites.",
    type: 'Lien',
    theme: 'Formation',
    url: 'https://learn.cjs.sn/formation/anglais-pro-intermediaire',
  },
  {
    seedNid: 16,
    titre: 'Wolof professionnel — vocabulaire de base',
    description:
      "Guide bilingue (français/wolof) du vocabulaire professionnel : salutations, négociation, vocabulaire administratif et commercial.",
    type: 'PDF',
    theme: 'Formation',
    url: 'https://ressources.cjs.sn/formation/wolof-professionnel.pdf',
  },

  // — Soft skills —
  {
    seedNid: 17,
    titre: 'Maîtriser le pitch elevator',
    description:
      "Vidéo coaching de 8 min : construire un pitch percutant en 60 secondes, structure AIDA et exemples commentés.",
    type: 'Video',
    theme: 'Soft skills',
    url: 'https://video.cjs.sn/soft-skills/pitch-elevator',
  },
  {
    seedNid: 18,
    titre: 'Soft skills indispensables au travail',
    description:
      "Top 10 des compétences comportementales recherchées au Sénégal (esprit d'équipe, autonomie, communication, gestion du temps).",
    type: 'Video',
    theme: 'Soft skills',
    url: 'https://video.cjs.sn/soft-skills/top-10-soft-skills',
  },
  {
    seedNid: 19,
    titre: 'Gestion du stress en entretien',
    description:
      "Techniques de respiration, ancrage mental et préparation pour aborder sereinement un entretien d'embauche.",
    type: 'Video',
    theme: 'Soft skills',
    url: 'https://video.cjs.sn/soft-skills/gestion-stress-entretien',
  },

  // — Financements —
  {
    seedNid: 20,
    titre: 'Financer son projet — DER/FJ',
    description:
      "Guide complet des dispositifs de la Délégation à l'Entrepreneuriat Rapide : nano-crédits, crédits classiques, conditions et constitution du dossier.",
    type: 'PDF',
    theme: 'Financements',
    url: 'https://ressources.cjs.sn/financements/guide-der-fj.pdf',
  },
]

/**
 * Insère ou met à jour les 20 ressources de fixture.
 * Idempotent via `drupalNid` (sentinelle SEED_NID_BASE - seedNid).
 */
export async function seedRessources(prisma: PrismaClient): Promise<number> {
  for (const r of RESSOURCES_SEED) {
    const drupalNid = SEED_NID_BASE - r.seedNid
    await prisma.ressource.upsert({
      where: { drupalNid },
      update: {
        titre: r.titre,
        description: r.description,
        type: r.type,
        theme: r.theme,
        url: r.url,
        estPublic: true,
      },
      create: {
        drupalNid,
        titre: r.titre,
        description: r.description,
        type: r.type,
        theme: r.theme,
        url: r.url,
        estPublic: true,
      },
    })
  }
  return RESSOURCES_SEED.length
}
