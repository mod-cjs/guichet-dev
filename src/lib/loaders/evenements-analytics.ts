import { prisma } from '@/lib/prisma'
import type { TypeEvenement, StatutEvenement, StatutInscription } from '@prisma/client'

/**
 * GUIC-472 — Analytics des ÉVÉNEMENTS, strictement distincts de la fréquentation
 * des centres (check-ins). Ce loader ne lit QUE `Evenement` + `InscriptionEvenement` ;
 * il ne touche jamais `CheckIn` ni `Reservation` (découplage acté par Mame Aïssatou).
 */

export interface EvenementsAnalyticsFilters {
  from: Date
  to: Date
  centreIds?: string[]
}

export interface CountItem<T extends string> {
  key: T
  count: number
}
export interface TopCentreItem {
  centreNom: string
  evenements: number
  inscriptions: number
}
export interface MoisItem {
  mois: string // yyyy-mm
  evenements: number
}

export interface EvenementsAnalytics {
  totalEvenements: number
  parType: CountItem<TypeEvenement>[]
  parStatut: CountItem<StatutEvenement>[]
  totalInscriptions: number
  inscriptionsParStatut: CountItem<StatutInscription>[]
  presents: number
  confirmes: number
  /** present / (inscrit + present), 0..1. */
  tauxPresence: number
  participantsUniques: number
  capaciteTotale: number
  /** confirmés / capacité totale, 0..1. */
  tauxRemplissage: number
  topCentres: TopCentreItem[]
  parMois: MoisItem[]
}

const ROW_CAP = 5000

export async function getEvenementsAnalytics(
  filters: EvenementsAnalyticsFilters,
): Promise<EvenementsAnalytics> {
  const { from, to, centreIds } = filters
  const eventWhere = {
    dateDebut: { gte: from, lte: to },
    ...(centreIds && centreIds.length ? { centreId: { in: centreIds } } : {}),
  }

  const [events, inscStatut, participants] = await Promise.all([
    prisma.evenement.findMany({
      where: eventWhere,
      select: {
        type: true,
        statut: true,
        capaciteMax: true,
        dateDebut: true,
        centre: { select: { nom: true } },
        _count: { select: { inscriptions: true } },
      },
      take: ROW_CAP,
    }),
    prisma.inscriptionEvenement.groupBy({
      by: ['statut'],
      where: { evenement: eventWhere },
      _count: { _all: true },
    }),
    prisma.inscriptionEvenement.groupBy({
      by: ['cjsUid'],
      where: { evenement: eventWhere },
    }),
  ])

  const typeMap = new Map<string, number>()
  const statutMap = new Map<string, number>()
  const centreMap = new Map<string, { evenements: number; inscriptions: number }>()
  const moisMap = new Map<string, number>()
  let capaciteTotale = 0
  let totalInscriptions = 0

  for (const e of events) {
    typeMap.set(e.type, (typeMap.get(e.type) ?? 0) + 1)
    statutMap.set(e.statut, (statutMap.get(e.statut) ?? 0) + 1)
    capaciteTotale += e.capaciteMax ?? 0
    totalInscriptions += e._count.inscriptions
    const cn = e.centre?.nom ?? '(sans centre)'
    const c = centreMap.get(cn) ?? { evenements: 0, inscriptions: 0 }
    c.evenements += 1
    c.inscriptions += e._count.inscriptions
    centreMap.set(cn, c)
    const mois = e.dateDebut.toISOString().slice(0, 7)
    moisMap.set(mois, (moisMap.get(mois) ?? 0) + 1)
  }

  const inscriptionsParStatut: CountItem<StatutInscription>[] = inscStatut.map((g) => ({
    key: g.statut as StatutInscription,
    count: g._count._all,
  }))
  const presents = inscStatut.find((g) => g.statut === 'present')?._count._all ?? 0
  const inscrits = inscStatut.find((g) => g.statut === 'inscrit')?._count._all ?? 0
  const confirmes = presents + inscrits
  const tauxPresence = confirmes > 0 ? presents / confirmes : 0
  const tauxRemplissage = capaciteTotale > 0 ? confirmes / capaciteTotale : 0

  const topCentres = [...centreMap.entries()]
    .map(([centreNom, v]) => ({ centreNom, ...v }))
    .sort((a, b) => b.evenements - a.evenements)
    .slice(0, 5)

  const parMois = [...moisMap.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([mois, evenements]) => ({ mois, evenements }))

  return {
    totalEvenements: events.length,
    parType: [...typeMap.entries()].map(([key, count]) => ({ key: key as TypeEvenement, count })),
    parStatut: [...statutMap.entries()].map(([key, count]) => ({ key: key as StatutEvenement, count })),
    totalInscriptions,
    inscriptionsParStatut,
    presents,
    confirmes,
    tauxPresence,
    participantsUniques: participants.length,
    capaciteTotale,
    tauxRemplissage,
    topCentres,
    parMois,
  }
}
