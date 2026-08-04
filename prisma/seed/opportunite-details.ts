/**
 * Seed — détails de sous-type des opportunités (GUIC-689).
 *
 * Le seed principal (`opportunites.ts`) crée les opportunités mais aucune ligne
 * dans les 10 tables de sous-type : les lignes existantes venaient de la
 * migration et portaient des valeurs de remplissage (`montant_total_fcfa = 0`,
 * `organisme_financeur = 'À renseigner'`). Résultat en local : la fiche d'une
 * bourse n'affichait ni montant crédible ni financeur, et l'écran paraissait
 * plus pauvre qu'il ne l'est réellement.
 *
 * Ce seed remplit chaque sous-type avec des valeurs plausibles et COHÉRENTES
 * avec l'opportunité parente (organisation, région, domaine, échéance) —
 * montants en FCFA aux ordres de grandeur du marché sénégalais, organismes
 * réels du réseau (DER/FJ, ANPEJ, PNUD, Campus France…), destinations de
 * mobilité usuelles.
 *
 * Idempotent : upsert sur `opportuniteId`.
 */
import type { PrismaClient, TypeOpportunite } from '@prisma/client'

const DAY = 86_400_000

/** Choix déterministe dans une liste (pas de hasard : seed reproductible). */
function pick<T>(list: readonly T[], i: number): T {
  return list[i % list.length]
}

const ORGANISMES_FINANCEURS = [
  'Délégation à l’Entrepreneuriat Rapide (DER/FJ)',
  'PNUD Sénégal',
  'Fonds de Garantie des Investissements Prioritaires (FONGIP)',
  'Agence Française de Développement',
  'Coopération allemande (GIZ)',
] as const

const ORGANISMES_CERTIFICATEURS = [
  'ISEP de Thiès',
  'Université Cheikh Anta Diop',
  'Simplon Sénégal',
  'Consortium Jeunesse Sénégal',
] as const

const DESTINATIONS = [
  'Rabat, Maroc',
  'Tunis, Tunisie',
  'Abidjan, Côte d’Ivoire',
  'Montpellier, France',
  'Kigali, Rwanda',
] as const

const THEMATIQUES = [
  'Transition numérique',
  'Agriculture durable',
  'Économie sociale et solidaire',
  'Santé communautaire',
  'Énergies renouvelables',
] as const

const NIVEAUX = ['BAC', 'BAC_PLUS_2', 'BAC_PLUS_3', 'BAC_PLUS_5'] as const
const CONTRATS = ['CDI', 'CDD', 'ALTERNANCE', 'FREELANCE'] as const
const MODALITES_FORMATION = ['PRESENTIEL', 'HYBRIDE', 'DISTANCE'] as const
const TYPES_FINANCEMENT = ['MICROCREDIT', 'SUBVENTION', 'DOTATION', 'PRET_HONNEUR', 'CAPITAL_AMORCAGE'] as const
const MODALITES_MENTORAT = ['INDIVIDUEL', 'GROUPE', 'COHORTE'] as const
const TYPES_MOBILITE = ['ETUDE', 'STAGE', 'PROFESSIONNELLE', 'RECHERCHE'] as const
const TYPES_VOLONTARIAT = ['SERVICE_CIVIQUE', 'ENGAGEMENT', 'INTERNATIONAL', 'HUMANITAIRE'] as const

/**
 * Remplit les tables de sous-type pour toutes les opportunités existantes.
 * Le sous-type dérive du `type` de l'opportunité (enum à 6 valeurs) ; les
 * sous-types plus fins (mentorat, mobilité, financement) sont dérivés du
 * domaine pour donner de la variété sans contredire le type affiché.
 */
export async function seedOpportuniteDetails(prisma: PrismaClient): Promise<number> {
  const opps = await prisma.opportunite.findMany({
    select: { id: true, type: true, domaine: true, region: true, organisation: true, deadline: true },
    orderBy: { createdAt: 'asc' },
  })

  let n = 0
  for (let i = 0; i < opps.length; i++) {
    const o = opps[i]
    const base = { opportuniteId: o.id }
    const dansNJours = (j: number) => new Date(Date.now() + j * DAY)

    switch (o.type as TypeOpportunite) {
      case 'Emploi': {
        const data = {
          typeContrat: pick(CONTRATS, i),
          dureeContratMois: i % 3 === 0 ? null : 12 + (i % 4) * 6,
          experienceRequise: pick(['Débutant accepté', '1 an minimum', '2 à 3 ans', '5 ans et plus'], i),
          teletravail: i % 4 === 0,
          niveauEtudeMin: pick(NIVEAUX, i),
        }
        await prisma.opportuniteEmploi.upsert({ where: base, create: { ...base, ...data }, update: data })
        break
      }
      case 'Stage': {
        const indemnise = i % 5 !== 0
        const data = {
          dureeMois: 3 + (i % 4) * 3,
          conventionneEcole: i % 3 !== 0,
          indemnise,
          indemniteMensuelleFcfa: indemnise ? 50_000 + (i % 6) * 25_000 : null,
          niveauEtudeMin: pick(NIVEAUX, i + 1),
          dateDebutPrevue: dansNJours(30 + (i % 8) * 15),
        }
        await prisma.opportuniteStage.upsert({ where: base, create: { ...base, ...data }, update: data })
        break
      }
      case 'Formation': {
        const gratuite = i % 3 !== 1
        const certifiante = i % 2 === 0
        const data = {
          dureeHeures: 35 + (i % 6) * 35,
          modalite: pick(MODALITES_FORMATION, i),
          certifiante,
          organismeCertificateur: certifiante ? pick(ORGANISMES_CERTIFICATEURS, i) : null,
          prerequis: pick(
            [
              'Aucun prérequis — formation ouverte à tous les jeunes de 16 à 35 ans.',
              'Savoir lire et écrire en français ; motivation pour le secteur.',
              'Niveau bac ou équivalent, première expérience appréciée.',
            ],
            i,
          ),
          gratuite,
          fraisInscriptionFcfa: gratuite ? null : 15_000 + (i % 4) * 10_000,
        }
        await prisma.opportuniteFormation.upsert({ where: base, create: { ...base, ...data }, update: data })
        break
      }
      case 'Bourse': {
        const data = {
          montantTotalFcfa: 750_000 + (i % 8) * 250_000,
          dureeMois: 6 + (i % 5) * 6,
          niveauEtudeRequis: pick(NIVEAUX, i + 2),
          paysDestination: i % 3 === 0 ? 'Sénégal' : pick(DESTINATIONS, i).split(', ')[1],
          organismeFinanceur: pick(ORGANISMES_FINANCEURS, i),
          coupleObligatoire: false,
        }
        await prisma.opportuniteBourse.upsert({ where: base, create: { ...base, ...data }, update: data })
        break
      }
      case 'Appel_a_projets': {
        const data = {
          budgetMaxFcfa: 1_500_000 + (i % 7) * 500_000,
          dureeProjetMois: 6 + (i % 4) * 6,
          thematique: pick(THEMATIQUES, i),
          dossierRequis:
            'Note de présentation du projet (5 pages max), budget prévisionnel, ' +
            'pièce d’identité du porteur et attestation d’enregistrement si la structure existe.',
          criteresEligibilite:
            'Porteur âgé de 18 à 35 ans, résidant au Sénégal. Projet à impact social ou ' +
            'environnemental mesurable. Structure de moins de 3 ans ou en cours de création.',
        }
        await prisma.opportuniteAppelAProjets.upsert({ where: base, create: { ...base, ...data }, update: data })
        break
      }
      case 'Volontariat': {
        const indemnise = i % 4 !== 0
        const data = {
          dureeMois: 6 + (i % 3) * 6,
          typeVolontariat: pick(TYPES_VOLONTARIAT, i),
          indemniteMensuelleFcfa: indemnise ? 60_000 + (i % 4) * 20_000 : null,
          domaineMission: pick(
            ['Éducation et alphabétisation', 'Santé communautaire', 'Environnement et reboisement', 'Inclusion numérique'],
            i,
          ),
          placesDisponibles: 3 + (i % 12),
        }
        await prisma.opportuniteVolontariat.upsert({ where: base, create: { ...base, ...data }, update: data })
        break
      }
      default:
        continue
    }
    n++
  }

  // Sous-types fins (concours, financement, mentorat, mobilité) : le modèle
  // `Opportunite.type` ne les distingue pas, mais les tables existent et les
  // écrans savent les afficher. On en dérive quelques-uns depuis les
  // opportunités « Appel_a_projets » et « Bourse » pour que ces vues aient de
  // la matière en local — sans toucher au `type` affiché de l'opportunité.
  const pourFins = opps.filter((o) => o.type === 'Appel_a_projets' || o.type === 'Bourse').slice(0, 12)
  for (let i = 0; i < pourFins.length; i++) {
    const o = pourFins[i]
    const base = { opportuniteId: o.id }
    const dansNJours = (j: number) => new Date(Date.now() + j * DAY)

    if (i % 4 === 0) {
      const data = {
        organismeOrganisateur: pick(['ANPEJ', 'Fonction publique sénégalaise', 'ISEP de Thiès'], i),
        dateEpreuves: dansNJours(45 + (i % 6) * 10),
        lieuEpreuves: `Centre d’examen — ${o.region ?? 'Dakar'}`,
        preuvesDemandees: 'Épreuve écrite d’admissibilité puis entretien de motivation devant jury.',
        placesDisponibles: 15 + (i % 5) * 10,
      }
      await prisma.opportuniteConcours.upsert({ where: base, create: { ...base, ...data }, update: data })
    } else if (i % 4 === 1) {
      const data = {
        montantFcfa: 500_000 + (i % 6) * 500_000,
        typeFinancement: pick(TYPES_FINANCEMENT, i),
        tauxAnnuel: i % 3 === 0 ? null : (3 + (i % 5)).toString(),
        garanties: i % 2 === 0 ? 'Caution solidaire d’un groupement ou d’un tiers.' : null,
        dureeRemboursementMois: 12 + (i % 4) * 12,
        organismeFinanceur: pick(ORGANISMES_FINANCEURS, i + 1),
        isContinuous: i % 3 === 0,
        dateLimiteDepot: i % 3 === 0 ? null : dansNJours(30 + (i % 5) * 15),
      }
      await prisma.opportuniteFinancement.upsert({ where: base, create: { ...base, ...data }, update: data })
    } else if (i % 4 === 2) {
      const data = {
        dureeMois: 3 + (i % 4) * 3,
        modalite: pick(MODALITES_MENTORAT, i),
        thematique: pick(THEMATIQUES, i + 1),
        placesDisponibles: 8 + (i % 4) * 4,
        organisateurLibelle: o.organisation ?? 'Consortium Jeunesse Sénégal',
      }
      await prisma.opportuniteMentorat.upsert({ where: base, create: { ...base, ...data }, update: data })
    } else {
      const dest = pick(DESTINATIONS, i)
      const data = {
        destination: dest,
        typeMobilite: pick(TYPES_MOBILITE, i),
        dureeMois: 3 + (i % 5) * 3,
        prisEnCharge: pick(
          ['Voyage, visa et hébergement pris en charge', 'Hébergement et frais de scolarité', 'Bourse mensuelle uniquement'],
          i,
        ),
        niveauLangueRequis: dest.endsWith('France') || dest.endsWith('Maroc') ? 'Français courant' : 'Anglais B2',
        dateDepartPrevue: dansNJours(60 + (i % 6) * 20),
      }
      await prisma.opportuniteMobilite.upsert({ where: base, create: { ...base, ...data }, update: data })
    }
    n++
  }

  return n
}
