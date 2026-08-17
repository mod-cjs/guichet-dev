/**
 * Seed — 50 opportunités sénégalaises réalistes (GUIC-20).
 *
 * Couvre les 9 domaines, 6 types et 14 régions. Quelques opportunités sont en
 * brouillon / archivées / expirées pour exercer les filtres de visibilité.
 * Idempotent : upsert sur le `slug` (dérivé du titre, titres tous distincts).
 */

import type { PrismaClient, Domaine, Region, TypeOpportunite } from '@prisma/client'
import { slugify } from '../../src/lib/slug'

type Entry = [
  titre: string,
  type: TypeOpportunite,
  domaine: Domaine,
  region: Region,
  organisation: string,
  remuneration: string | null,
]

const ENTRIES: Entry[] = [
  // Agriculture
  ['Stage en maraîchage irrigué', 'Stage', 'Economie', 'Saint_Louis', 'Ferme Agricole de Ngalèle', '80 000 FCFA/mois'],
  ['Technicien en aviculture', 'Emploi', 'Economie', 'Thies', 'GIE Agropole Sud', 'Salaire négociable'],
  ["Formation à l'agroécologie", 'Formation', 'Economie', 'Fatick', 'SOS Sahel', null],
  ['Appel à projets agritech', 'Appel_a_projets', 'Economie', 'Dakar', 'Délégation à l’Entrepreneuriat Rapide (DER/FJ)', "Jusqu'à 5 000 000 FCFA"],
  ['Volontariat reboisement agricole', 'Volontariat', 'Economie', 'Kaffrine', 'Enda Tiers Monde', 'Non rémunéré'],
  ['Bourse de formation agropastorale', 'Bourse', 'Economie', 'Matam', 'PNUD Sénégal', 'Bourse complète'],

  // Numérique
  ['Développeur web junior', 'Emploi', 'Economie', 'Dakar', 'CTIC Dakar', '350 000 FCFA/mois'],
  ['Stage data et analyse', 'Stage', 'Economie', 'Dakar', 'Sonatel', '100 000 FCFA/mois'],
  ['Formation développeur full-stack', 'Formation', 'Economie', 'Thies', 'Simplon Sénégal', null],
  ['Bourse école du code', 'Bourse', 'Economie', 'Dakar', 'Orange Sénégal', 'Bourse complète'],
  ['Appel à projets fintech jeunes', 'Appel_a_projets', 'Economie', 'Dakar', 'Wave Mobile Money', "Jusqu'à 3 000 000 FCFA"],
  ['Technicien support informatique', 'Emploi', 'Economie', 'Ziguinchor', 'Baobab+', 'Salaire négociable'],
  ['Volontariat médiation numérique', 'Volontariat', 'Economie', 'Louga', 'Conseil National de la Jeunesse', 'Indemnité de transport'],

  // Entrepreneuriat
  ['Incubation de startups jeunes', 'Appel_a_projets', 'Economie', 'Dakar', 'Délégation à l’Entrepreneuriat Rapide (DER/FJ)', 'Financement et accompagnement'],
  ["Formation création d'entreprise", 'Formation', 'Economie', 'Kaolack', 'ANPEJ', null],
  ['Conseiller en microfinance', 'Emploi', 'Economie', 'Diourbel', 'Crédit Mutuel du Sénégal', 'Salaire selon profil'],
  ['Stage gestion de coopérative', 'Stage', 'Economie', 'Kolda', 'GIE Agropole Sud', '60 000 FCFA/mois'],
  ['Bourse entrepreneuriat féminin', 'Bourse', 'Economie', 'Sedhiou', 'ONG Aide et Action', 'Bourse et capital de démarrage'],
  ['Appel à projets économie sociale', 'Appel_a_projets', 'Economie', 'Tambacounda', 'PNUD Sénégal', "Jusqu'à 2 000 000 FCFA"],

  // Citoyenneté
  ['Volontariat civique communautaire', 'Volontariat', 'Citoyennete', 'Kaffrine', 'Conseil National de la Jeunesse', 'Indemnité mensuelle'],
  ["Animateur d'éducation civique", 'Emploi', 'Citoyennete', 'Kedougou', 'Enda Tiers Monde', 'Salaire négociable'],
  ['Formation leadership des jeunes', 'Formation', 'Citoyennete', 'Dakar', 'Consortium Jeunesse Sénégal', null],
  ['Stage observation électorale', 'Stage', 'Citoyennete', 'Saint_Louis', 'ONG Aide et Action', 'Indemnité de stage'],
  ['Appel à projets engagement citoyen', 'Appel_a_projets', 'Citoyennete', 'Thies', 'Consortium Jeunesse Sénégal', "Jusqu'à 1 500 000 FCFA"],

  // Environnement
  ['Technicien gestion des déchets', 'Emploi', 'Ecologie', 'Dakar', 'SOS Sahel', 'Salaire négociable'],
  ['Volontariat protection du littoral', 'Volontariat', 'Ecologie', 'Ziguinchor', 'Enda Tiers Monde', 'Non rémunéré'],
  ['Formation énergies renouvelables', 'Formation', 'Ecologie', 'Thies', 'ISEP de Thiès', null],
  ['Bourse master environnement', 'Bourse', 'Ecologie', 'Dakar', 'Université Cheikh Anta Diop', 'Bourse complète'],
  ['Stage suivi de la biodiversité', 'Stage', 'Ecologie', 'Tambacounda', 'PNUD Sénégal', '70 000 FCFA/mois'],

  // Santé
  ['Agent communautaire de santé', 'Emploi', 'BienEtre', 'Matam', 'ONG Aide et Action', 'Salaire négociable'],
  ['Stage en santé publique', 'Stage', 'BienEtre', 'Dakar', 'PNUD Sénégal', '90 000 FCFA/mois'],
  ['Formation aux premiers secours', 'Formation', 'BienEtre', 'Louga', 'SOS Sahel', null],
  ['Volontariat sensibilisation nutrition', 'Volontariat', 'BienEtre', 'Kolda', 'Enda Tiers Monde', 'Indemnité de transport'],
  ['Bourse de formation infirmier', 'Bourse', 'BienEtre', 'Saint_Louis', 'Université Cheikh Anta Diop', 'Bourse partielle'],

  // Éducation
  ['Enseignant vacataire de mathématiques', 'Emploi', 'Employabilite', 'Diourbel', 'ONG Aide et Action', 'Salaire horaire'],
  ['Stage assistant pédagogique', 'Stage', 'Employabilite', 'Dakar', 'Simplon Sénégal', '60 000 FCFA/mois'],
  ['Formation de formateurs', 'Formation', 'Employabilite', 'Kaolack', 'Consortium Jeunesse Sénégal', null],
  ["Bourse d'excellence universitaire", 'Bourse', 'Employabilite', 'Dakar', 'Université Cheikh Anta Diop', 'Bourse complète'],
  ['Volontariat alphabétisation', 'Volontariat', 'Employabilite', 'Fatick', 'Enda Tiers Monde', 'Indemnité mensuelle'],
  ['Appel à projets éducation rurale', 'Appel_a_projets', 'Employabilite', 'Sedhiou', 'PNUD Sénégal', "Jusqu'à 2 000 000 FCFA"],

  // Culture
  ['Médiateur culturel', 'Emploi', 'Culture', 'Saint_Louis', 'Conseil National de la Jeunesse', 'Salaire négociable'],
  ['Stage production événementielle', 'Stage', 'Culture', 'Dakar', 'CTIC Dakar', '70 000 FCFA/mois'],
  ['Formation aux métiers du spectacle', 'Formation', 'Culture', 'Thies', 'ISEP de Thiès', null],
  ['Bourse résidence artistique', 'Bourse', 'Culture', 'Ziguinchor', 'ONG Aide et Action', 'Bourse et hébergement'],
  ['Appel à projets patrimoine local', 'Appel_a_projets', 'Culture', 'Louga', 'Consortium Jeunesse Sénégal', "Jusqu'à 1 000 000 FCFA"],

  // Autre
  ['Assistant administratif', 'Emploi', 'Autre', 'Dakar', 'ANPEJ', '200 000 FCFA/mois'],
  ['Stage logistique et transport', 'Stage', 'Autre', 'Thies', 'Sonatel', '80 000 FCFA/mois'],
  ['Formation en langues professionnelles', 'Formation', 'Autre', 'Dakar', 'Simplon Sénégal', null],
  ['Volontariat appui humanitaire', 'Volontariat', 'Autre', 'Matam', 'SOS Sahel', 'Indemnité de mission'],
  ['Bourse mobilité internationale des jeunes', 'Bourse', 'Autre', 'Dakar', 'Consortium Jeunesse Sénégal', 'Bourse complète'],
]

const DAY = 86_400_000

function description(e: Entry): string {
  const [titre, type, domaine, region, organisation] = e
  return (
    `${organisation} recrute pour « ${titre} » dans la région de ${region}. ` +
    `Cette opportunité de type ${type.toLowerCase().replace(/_/g, ' ')} s'adresse aux jeunes ` +
    `du Sénégal intéressés par le domaine ${domaine.toLowerCase()}. ` +
    `Les candidatures sont ouvertes aux profils motivés ; un accompagnement est prévu ` +
    `tout au long de la mission. Rejoignez le programme YEAH et le réseau du Consortium ` +
    `Jeunesse Sénégal pour développer vos compétences et votre employabilité.`
  )
}

/** Variété de statut pour exercer les filtres de visibilité. */
function statutFor(i: number): 'publiee' | 'brouillon' | 'archivee' | 'expiree' {
  if (i % 14 === 9) return 'expiree'
  if (i % 12 === 5) return 'brouillon'
  if (i % 16 === 7) return 'archivee'
  return 'publiee'
}

/** Deadline : passée (expirée), nulle, ou future selon l'index. */
function deadlineFor(i: number, statut: string): Date | null {
  if (statut === 'expiree') return new Date(Date.now() - (5 + (i % 20)) * DAY)
  if (i % 9 === 4) return null
  if (statut === 'publiee' && i % 19 === 3) return new Date(Date.now() - (3 + (i % 10)) * DAY)
  return new Date(Date.now() + (12 + ((i * 13) % 110)) * DAY)
}

export async function seedOpportunites(prisma: PrismaClient): Promise<number> {
  for (let i = 0; i < ENTRIES.length; i++) {
    const e = ENTRIES[i]
    const [titre, type, domaine, region, organisation, remuneration] = e
    const slug = slugify(titre)
    const statut = statutFor(i)

    const data = {
      titre,
      description: description(e),
      type,
      domaine,
      region,
      organisation,
      remuneration,
      statut,
      deadline: deadlineFor(i, statut),
      vues: (i * 7) % 250,
      createdAt: new Date(Date.now() - i * DAY),
    }

    await prisma.opportunite.upsert({
      where: { slug },
      create: { slug, ...data },
      update: data,
    })
  }
  return ENTRIES.length
}
