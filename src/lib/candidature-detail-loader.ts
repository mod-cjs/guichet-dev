/**
 * Loader « détail candidature » (GUIC-253).
 *
 * Charge une candidature appartenant au jeune connecté pour la page
 * `/jeune/mes-candidatures/[id]`. La vérification d'ownership est réalisée
 * dans la requête (`where: { id, cjsUid }`) ; retourner `null` doit toujours
 * être traduit par un 404 côté page (pas de fuite « existe / pas à toi »).
 *
 * Périmètre Wave 4 : ne consomme que les champs présents dans le schéma
 * Prisma actuel (cf. garde-fou ticket — pas de migration ici).
 */

import { prisma } from '@/lib/prisma'
import type {
  StatutCandidature,
  TypeOpportunite,
  Domaine,
  Region,
  ModeEntretien,
  StatutEntretien,
} from '@prisma/client'

export interface CandidatureDetailDTO {
  id: string
  statut: StatutCandidature
  lettreMotivation: string | null
  cvUrl: string | null
  soumiseA: string // ISO 8601
  updatedAt: string // ISO 8601
  /**
   * GUIC-689 (É-13) — entretien le plus proche rattaché à cette candidature,
   * `null` s'il n'y en a pas. Seul un entretien PLANIFIÉ constitue une
   * prochaine étape : un entretien annulé n'en est pas une.
   */
  entretien: {
    dateHeure: string // ISO 8601
    mode: ModeEntretien
    statut: StatutEntretien
    lieu: string | null
  } | null
  opportunite: {
    slug: string
    titre: string
    organisation: string
    deadline: string | null // ISO 8601
    type: TypeOpportunite
    domaine: Domaine
    description: string
    /** GUIC-689 (É-13) — nullable en base : absent = ligne masquée, jamais un tiret. */
    region: Region | null
    /** Texte libre en base (« 150 000 FCFA », « Non rémunéré »…), jamais un nombre. */
    remuneration: string | null
  }
}

/**
 * Charge le détail d'une candidature appartenant à l'utilisateur.
 * Retourne `null` si introuvable OU si elle n'appartient pas au `cjsUid`
 * (mêmes effet — la page doit faire un 404 dans les deux cas).
 */
export async function loadCandidatureDetail(
  id: string,
  cjsUid: string,
): Promise<CandidatureDetailDTO | null> {
  if (!id || !cjsUid) return null

  const row = await prisma.candidature.findFirst({
    where: { id, cjsUid },
    select: {
      id: true,
      statut: true,
      lettreMotivation: true,
      cvUrl: true,
      soumiseA: true,
      updatedAt: true,
      opportunite: {
        select: {
          slug: true,
          titre: true,
          organisation: true,
          deadline: true,
          type: true,
          domaine: true,
          description: true,
          region: true,
          remuneration: true,
        },
      },
      // Le plus proche dans le temps : c'est celui qui informe la prochaine étape.
      entretiens: {
        orderBy: { dateHeure: 'asc' },
        take: 1,
        select: { dateHeure: true, mode: true, statut: true, lieu: true },
      },
    },
  })

  if (!row) return null

  return {
    id: row.id,
    statut: row.statut,
    lettreMotivation: row.lettreMotivation,
    cvUrl: row.cvUrl,
    soumiseA: row.soumiseA.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    entretien: row.entretiens[0]
      ? {
          dateHeure: row.entretiens[0].dateHeure.toISOString(),
          mode: row.entretiens[0].mode,
          statut: row.entretiens[0].statut,
          lieu: row.entretiens[0].lieu,
        }
      : null,
    opportunite: {
      slug: row.opportunite.slug,
      titre: row.opportunite.titre,
      organisation: row.opportunite.organisation,
      deadline: row.opportunite.deadline ? row.opportunite.deadline.toISOString() : null,
      type: row.opportunite.type,
      domaine: row.opportunite.domaine,
      description: row.opportunite.description,
      region: row.opportunite.region,
      remuneration: row.opportunite.remuneration,
    },
  }
}
