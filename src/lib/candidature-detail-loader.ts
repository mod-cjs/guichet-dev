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
} from '@prisma/client'

export interface CandidatureDetailDTO {
  id: string
  statut: StatutCandidature
  lettreMotivation: string | null
  cvUrl: string | null
  soumiseA: string // ISO 8601
  updatedAt: string // ISO 8601
  opportunite: {
    slug: string
    titre: string
    organisation: string
    deadline: string | null // ISO 8601
    type: TypeOpportunite
    domaine: Domaine
    description: string
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
        },
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
    opportunite: {
      slug: row.opportunite.slug,
      titre: row.opportunite.titre,
      organisation: row.opportunite.organisation,
      deadline: row.opportunite.deadline ? row.opportunite.deadline.toISOString() : null,
      type: row.opportunite.type,
      domaine: row.opportunite.domaine,
      description: row.opportunite.description,
    },
  }
}
