/**
 * Loader analytics centres (admin Guichet) — Lot 7 Wave 6.3 / GUIC-388.
 *
 * Aggrège les réservations + check-ins sur une fenêtre temporelle filtrable
 * pour alimenter le dashboard `/admin/analytics/centres`.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 6.
 * ADR  : `.agent_context/adr/ADR-005-kpi-frequentation-evenements.md`.
 *
 * Toutes les requêtes passent par Prisma (CLAUDE.md absolute rule — SQL brut
 * interdit). Les agrégations lourdes utilisent `groupBy` pour éviter de
 * matérialiser N lignes côté process Node.
 */

import { prisma } from '@/lib/prisma'

export interface CentresAnalyticsFilters {
  /** Borne basse incluse. */
  from: Date
  /** Borne haute incluse. */
  to: Date
  /** Si vide ou omis → tous les centres. */
  centreIds?: string[]
}

export interface CentresAnalyticsKpis {
  totalReservations: number
  /** Total sur la période précédente de même durée (pour variation %). */
  totalReservationsPrev: number
  /** Taux check-in = checkins / réservations acceptées. 0–1. */
  checkinRate: number
  /** Taux annulation = annulées / total. 0–1. */
  cancelRate: number
  /** Taux no-show = (NonHonoree + Passée sans CheckIn) / acceptées. 0–1. */
  noShowRate: number
}

/** Ventilation des accès au centre par canal de check-in (GUIC-388 — extension QR). */
export interface CentresAnalyticsAccesQr {
  /** Total des check-ins sur la période. */
  total: number
  /** Check-ins via scan du QR de la carte CJS (`CheckInVia.QrCard`). */
  parQr: number
  /** Check-ins saisis manuellement par le staff (`CheckInVia.Manuel`). */
  parManuel: number
  /** Part des accès faits par QR. 0–1. */
  tauxQr: number
}

export interface CentresAnalytics {
  kpis: CentresAnalyticsKpis
  reservationsByDay: Array<{ date: string; count: number }>
  topCentres: Array<{ centreId: string; centreNom: string; count: number }>
  byType: Array<{ type: string; count: number }>
  byStatut: Array<{ statut: string; count: number }>
  /** Accès par QR vs manuel sur la période. */
  accesQr: CentresAnalyticsAccesQr
  /** Tendance journalière des accès par QR (continue, jours à 0 inclus). */
  accesQrParJour: Array<{ date: string; count: number }>
}

function buildWhere(filters: CentresAnalyticsFilters) {
  const where: {
    dateReservee: { gte: Date; lte: Date }
    centreId?: { in: string[] }
  } = {
    dateReservee: { gte: filters.from, lte: filters.to },
  }
  if (filters.centreIds && filters.centreIds.length > 0) {
    where.centreId = { in: filters.centreIds }
  }
  return where
}

function isoDay(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/**
 * Charge le dashboard analytics centres pour une fenêtre temporelle.
 *
 * Implémentation :
 * - 1 `groupBy(statut)` → KPIs totaux + cancelRate
 * - 1 `count` CheckIn → numérateur checkinRate
 * - 1 `groupBy(centreId)` ordonné → top 5 + join Centre.nom
 * - 1 `groupBy(ressourceId)` puis join RessourceCentre → byType
 * - 1 `findMany` léger (select date) puis agrégation JS par jour
 * - 1 `count` sur la fenêtre précédente (même durée) pour la variation
 */
export async function getCentresAnalytics(
  filters: CentresAnalyticsFilters,
): Promise<CentresAnalytics> {
  const where = buildWhere(filters)
  const centreFilter = filters.centreIds && filters.centreIds.length > 0
    ? { in: filters.centreIds }
    : undefined

  // 1. Statuts → KPIs + byStatut
  const statutGroups = await prisma.reservation.groupBy({
    by: ['statut'],
    where,
    _count: { _all: true },
  })
  const byStatutMap = new Map<string, number>()
  for (const g of statutGroups) byStatutMap.set(String(g.statut), g._count._all)
  const totalReservations = Array.from(byStatutMap.values()).reduce((a, b) => a + b, 0)
  const accepteeCount = byStatutMap.get('Acceptee') ?? 0
  const annuleeCount =
    (byStatutMap.get('AnnuleeParJeune') ?? 0) + (byStatutMap.get('Refusee') ?? 0)
  const nonHonoreeCount = byStatutMap.get('NonHonoree') ?? 0
  const passeeCount = byStatutMap.get('Passee') ?? 0

  // 2. Check-ins effectués (par effectueA dans la fenêtre)
  const checkinWhere: {
    effectueA: { gte: Date; lte: Date }
    centreId?: { in: string[] }
  } = {
    effectueA: { gte: filters.from, lte: filters.to },
  }
  if (centreFilter) checkinWhere.centreId = centreFilter
  // Un seul findMany (date + canal) sert : le total, le split QR/Manuel et la tendance QR.
  const checkins = await prisma.checkIn.findMany({
    where: checkinWhere,
    select: { effectueA: true, via: true },
  })
  const checkinCount = checkins.length
  const parQr = checkins.filter((c) => c.via === 'QrCard').length
  const parManuel = checkinCount - parQr
  const accesQr: CentresAnalyticsAccesQr = {
    total: checkinCount,
    parQr,
    parManuel,
    tauxQr: checkinCount > 0 ? parQr / checkinCount : 0,
  }

  const checkinRate = accepteeCount > 0 ? checkinCount / accepteeCount : 0
  const cancelRate = totalReservations > 0 ? annuleeCount / totalReservations : 0
  // noShow : NonHonoree + Passée non check-inée (proxy = passeeCount - checkinCount sur passées, on capte par NonHonoree).
  const noShowNum = nonHonoreeCount + Math.max(0, passeeCount - checkinCount)
  const noShowRate = accepteeCount > 0 ? noShowNum / accepteeCount : 0

  // 3. Période précédente (même durée) pour variation
  const durationMs = filters.to.getTime() - filters.from.getTime()
  const prevFrom = new Date(filters.from.getTime() - durationMs - 1)
  const prevTo = new Date(filters.from.getTime() - 1)
  const prevWhere: {
    dateReservee: { gte: Date; lte: Date }
    centreId?: { in: string[] }
  } = { dateReservee: { gte: prevFrom, lte: prevTo } }
  if (centreFilter) prevWhere.centreId = centreFilter
  const totalReservationsPrev = await prisma.reservation.count({ where: prevWhere })

  // 4. Top 5 centres
  const topGroups = await prisma.reservation.groupBy({
    by: ['centreId'],
    where,
    _count: { _all: true },
    orderBy: { _count: { centreId: 'desc' } },
    take: 5,
  })
  const topCentreIds = topGroups.map((g) => g.centreId)
  const centresInfo = topCentreIds.length > 0
    ? await prisma.centre.findMany({
        where: { id: { in: topCentreIds } },
        select: { id: true, nom: true },
      })
    : []
  const nomById = new Map(centresInfo.map((c) => [c.id, c.nom]))
  const topCentres = topGroups.map((g) => ({
    centreId: g.centreId,
    centreNom: nomById.get(g.centreId) ?? g.centreId,
    count: g._count._all,
  }))

  // 5. ByType (via ressource)
  const ressourceGroups = await prisma.reservation.groupBy({
    by: ['ressourceId'],
    where,
    _count: { _all: true },
  })
  const ressourceIds = ressourceGroups.map((g) => g.ressourceId)
  const ressourcesInfo = ressourceIds.length > 0
    ? await prisma.ressourceCentre.findMany({
        where: { id: { in: ressourceIds } },
        select: { id: true, type: true },
      })
    : []
  const typeById = new Map(ressourcesInfo.map((r) => [r.id, String(r.type)]))
  const byTypeMap = new Map<string, number>()
  for (const g of ressourceGroups) {
    const t = typeById.get(g.ressourceId) ?? 'Inconnu'
    byTypeMap.set(t, (byTypeMap.get(t) ?? 0) + g._count._all)
  }
  const byType = Array.from(byTypeMap.entries()).map(([type, count]) => ({ type, count }))

  // 6. Réservations par jour — select minimal + agrégation JS
  const rows = await prisma.reservation.findMany({
    where,
    select: { dateReservee: true },
  })
  const byDayMap = new Map<string, number>()
  for (const r of rows) {
    const d = isoDay(r.dateReservee)
    byDayMap.set(d, (byDayMap.get(d) ?? 0) + 1)
  }
  // Remplir tous les jours de la fenêtre (même à 0) pour un graphe continu.
  const reservationsByDay: Array<{ date: string; count: number }> = []
  const cursor = new Date(filters.from)
  cursor.setUTCHours(0, 0, 0, 0)
  const end = new Date(filters.to)
  end.setUTCHours(0, 0, 0, 0)
  while (cursor.getTime() <= end.getTime()) {
    const key = isoDay(cursor)
    reservationsByDay.push({ date: key, count: byDayMap.get(key) ?? 0 })
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }

  const byStatut = Array.from(byStatutMap.entries()).map(([statut, count]) => ({
    statut,
    count,
  }))

  // 7. Tendance journalière des accès par QR (même fenêtre continue que les réservations).
  const qrByDayMap = new Map<string, number>()
  for (const c of checkins) {
    if (c.via !== 'QrCard') continue
    const d = isoDay(c.effectueA)
    qrByDayMap.set(d, (qrByDayMap.get(d) ?? 0) + 1)
  }
  const accesQrParJour: Array<{ date: string; count: number }> = []
  const qrCursor = new Date(filters.from)
  qrCursor.setUTCHours(0, 0, 0, 0)
  const qrEnd = new Date(filters.to)
  qrEnd.setUTCHours(0, 0, 0, 0)
  while (qrCursor.getTime() <= qrEnd.getTime()) {
    const key = isoDay(qrCursor)
    accesQrParJour.push({ date: key, count: qrByDayMap.get(key) ?? 0 })
    qrCursor.setUTCDate(qrCursor.getUTCDate() + 1)
  }

  return {
    kpis: {
      totalReservations,
      totalReservationsPrev,
      checkinRate,
      cancelRate,
      noShowRate,
    },
    reservationsByDay,
    topCentres,
    byType,
    byStatut,
    accesQr,
    accesQrParJour,
  }
}
