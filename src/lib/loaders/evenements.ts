import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

/** Page par défaut (règle CLAUDE.md : 20 items/page). */
export const PAGE_SIZE = 20

export type TypeEvenementValue = 'Formation' | 'Atelier' | 'Forum' | 'Webinar' | 'Conference'

export interface EvenementFiltres {
  /** Recherche plein-texte sur titre, description, lieu. */
  q?: string
  /** Filtre type (un seul). */
  type?: TypeEvenementValue
  /** Page (1-indexé). */
  page?: number
}

export interface EvenementListItem {
  id: string
  titre: string
  description: string
  type: TypeEvenementValue
  statut: 'a_venir' | 'en_cours' | 'termine' | 'annule'
  dateDebut: string // ISO
  dateFin: string | null
  lieu: string
  estGratuit: boolean
  capaciteMax: number | null
  organisation: string | null
}

export interface EvenementListResult {
  items: EvenementListItem[]
  total: number
  page: number
  pageSize: number
}

const CARD_SELECT = {
  id: true,
  titre: true,
  description: true,
  type: true,
  statut: true,
  dateDebut: true,
  dateFin: true,
  lieu: true,
  estGratuit: true,
  capaciteMax: true,
  centre: { select: { nom: true } },
} satisfies Prisma.EvenementSelect

/**
 * Liste paginée des événements publics à venir.
 * Tri : date de début ascendante. Exclut les événements terminés/annulés.
 */
export async function listEvenements(
  filtres: EvenementFiltres = {},
): Promise<EvenementListResult> {
  const page = Math.max(1, filtres.page ?? 1)
  const skip = (page - 1) * PAGE_SIZE

  const where: Prisma.EvenementWhereInput = {
    statut: { in: ['a_venir', 'en_cours'] },
  }

  if (filtres.type) {
    where.type = filtres.type
  }

  if (filtres.q && filtres.q.trim()) {
    const q = filtres.q.trim()
    where.OR = [
      { titre: { contains: q } },
      { description: { contains: q } },
      { lieu: { contains: q } },
    ]
  }

  const [rows, total] = await Promise.all([
    prisma.evenement.findMany({
      where,
      select: CARD_SELECT,
      orderBy: { dateDebut: 'asc' },
      skip,
      take: PAGE_SIZE,
    }),
    prisma.evenement.count({ where }),
  ])

  const items: EvenementListItem[] = rows.map((r) => ({
    id: r.id,
    titre: r.titre,
    description: r.description,
    type: r.type as TypeEvenementValue,
    statut: r.statut as EvenementListItem['statut'],
    dateDebut:
      r.dateDebut instanceof Date ? r.dateDebut.toISOString() : new Date(r.dateDebut).toISOString(),
    dateFin: r.dateFin
      ? r.dateFin instanceof Date
        ? r.dateFin.toISOString()
        : new Date(r.dateFin).toISOString()
      : null,
    lieu: r.lieu,
    estGratuit: r.estGratuit,
    capaciteMax: r.capaciteMax,
    organisation: r.centre?.nom ?? null,
  }))

  return { items, total, page, pageSize: PAGE_SIZE }
}

/**
 * Détail d'un événement (vue `/agenda/[id]`).
 * Renvoie `null` si introuvable. Inclut le centre (nom, ville, lat/lng) pour
 * la carte. Le compteur de places restantes est calculé à partir des
 * inscriptions actives (`statut != 'annule'`).
 */
export interface EvenementDetail extends EvenementListItem {
  centre: { nom: string; ville: string | null; latitude: number; longitude: number } | null
  /** Places restantes (capaciteMax - inscriptions actives). null si pas de capacité. */
  placesRestantes: number | null
  /** Nombre d'inscrits (actifs). */
  inscriptionsCount: number
}

export async function getEvenementById(id: string): Promise<EvenementDetail | null> {
  const row = await prisma.evenement.findUnique({
    where: { id },
    select: {
      ...CARD_SELECT,
      centre: {
        select: { nom: true, ville: true, latitude: true, longitude: true },
      },
      _count: {
        select: {
          inscriptions: { where: { statut: { not: 'annule' } } },
        },
      },
    },
  })
  if (!row) return null

  const inscriptionsCount = row._count.inscriptions
  const placesRestantes = row.capaciteMax != null ? Math.max(0, row.capaciteMax - inscriptionsCount) : null

  return {
    id: row.id,
    titre: row.titre,
    description: row.description,
    type: row.type as TypeEvenementValue,
    statut: row.statut as EvenementListItem['statut'],
    dateDebut: row.dateDebut instanceof Date ? row.dateDebut.toISOString() : new Date(row.dateDebut).toISOString(),
    dateFin: row.dateFin
      ? row.dateFin instanceof Date
        ? row.dateFin.toISOString()
        : new Date(row.dateFin).toISOString()
      : null,
    lieu: row.lieu,
    estGratuit: row.estGratuit,
    capaciteMax: row.capaciteMax,
    organisation: row.centre?.nom ?? null,
    centre: row.centre
      ? {
          nom: row.centre.nom,
          ville: row.centre.ville,
          latitude: row.centre.latitude,
          longitude: row.centre.longitude,
        }
      : null,
    placesRestantes,
    inscriptionsCount,
  }
}

/**
 * Liste des inscriptions du jeune connecté.
 * Inclut l'événement (carte) et son statut d'inscription.
 * Tri : date d'événement ascendante pour les "à venir", descendante pour les "passés".
 */
export type StatutInscriptionValue = 'inscrit' | 'liste_attente' | 'annule' | 'present'

export interface MesInscriptionItem {
  inscriptionId: string
  statut: StatutInscriptionValue
  inscritA: string
  evenement: EvenementListItem
}

export async function getMesInscriptions(cjsUid: string): Promise<{
  aVenir: MesInscriptionItem[]
  passes: MesInscriptionItem[]
}> {
  const rows = await prisma.inscriptionEvenement.findMany({
    where: { cjsUid, statut: { not: 'annule' } },
    orderBy: { evenement: { dateDebut: 'asc' } },
    select: {
      id: true,
      statut: true,
      inscritA: true,
      evenement: { select: { ...CARD_SELECT } },
    },
  })

  const now = Date.now()
  const all: MesInscriptionItem[] = rows.map((r) => ({
    inscriptionId: r.id,
    statut: r.statut as StatutInscriptionValue,
    inscritA: r.inscritA instanceof Date ? r.inscritA.toISOString() : new Date(r.inscritA).toISOString(),
    evenement: {
      id: r.evenement.id,
      titre: r.evenement.titre,
      description: r.evenement.description,
      type: r.evenement.type as TypeEvenementValue,
      statut: r.evenement.statut as EvenementListItem['statut'],
      dateDebut:
        r.evenement.dateDebut instanceof Date
          ? r.evenement.dateDebut.toISOString()
          : new Date(r.evenement.dateDebut).toISOString(),
      dateFin: r.evenement.dateFin
        ? r.evenement.dateFin instanceof Date
          ? r.evenement.dateFin.toISOString()
          : new Date(r.evenement.dateFin).toISOString()
        : null,
      lieu: r.evenement.lieu,
      estGratuit: r.evenement.estGratuit,
      capaciteMax: r.evenement.capaciteMax,
      organisation: r.evenement.centre?.nom ?? null,
    },
  }))

  const aVenir: MesInscriptionItem[] = []
  const passes: MesInscriptionItem[] = []
  for (const item of all) {
    const refDate = item.evenement.dateFin ?? item.evenement.dateDebut
    if (new Date(refDate).getTime() >= now) aVenir.push(item)
    else passes.push(item)
  }
  // Passés en ordre descendant (plus récent en premier)
  passes.reverse()

  return { aVenir, passes }
}
