/**
 * GET /api/admin/analytics/centres/export — Lot 7 Wave 6.3 / GUIC-388.
 *
 * Streame un CSV des réservations sur la fenêtre temporelle filtrée.
 * Auth admin requise (cookie session SSO + role `admin`).
 *
 * Colonnes : Date;Centre;Ressource;Statut;Personnes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { trackCentreEvent } from '@/lib/analytics/centre-events'
import { logger } from '@/lib/logger'

const HEADER = 'Date;Centre;Ressource;Statut;Personnes'

function csvEscape(v: string): string {
  // Sépérateur `;` → on n'autorise pas le `;` ni le `"` ni les \n dans la valeur.
  const cleaned = v.replace(/[;\r\n]/g, ' ').replace(/"/g, "'")
  return cleaned
}

function parseDate(v: string | null, fallback: Date): Date {
  if (!v) return fallback
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? fallback : d
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Admin requis' } },
      { status: 403 },
    )
  }

  const sp = req.nextUrl.searchParams
  const now = new Date()
  const from = parseDate(sp.get('from'), new Date(now.getTime() - 30 * 86400_000))
  const to = parseDate(sp.get('to'), now)
  const centreIdParam = sp.get('centreId')
  const centreIds = centreIdParam
    ? centreIdParam.split(',').filter(Boolean)
    : []

  const where: {
    dateReservee: { gte: Date; lte: Date }
    centreId?: { in: string[] }
  } = { dateReservee: { gte: from, lte: to } }
  if (centreIds.length > 0) where.centreId = { in: centreIds }

  const rows = await prisma.reservation.findMany({
    where,
    select: {
      dateReservee: true,
      statut: true,
      nombrePersonnes: true,
      centre: { select: { nom: true } },
      ressource: { select: { nom: true } },
    },
    orderBy: { dateReservee: 'asc' },
  })

  const lines = [HEADER]
  for (const r of rows) {
    lines.push(
      [
        r.dateReservee.toISOString().slice(0, 10),
        csvEscape(r.centre?.nom ?? ''),
        csvEscape(r.ressource?.nom ?? ''),
        String(r.statut),
        String(r.nombrePersonnes),
      ].join(';'),
    )
  }
  const body = lines.join('\n') + '\n'

  // Tracking fail-soft
  try {
    await trackCentreEvent({
      type: 'admin_analytics_centres_csv_exported',
      cjsUid: session.cjsUid,
      metadata: {
        from: from.toISOString(),
        to: to.toISOString(),
        rows: rows.length,
      },
    })
  } catch (e) {
    logger.warn('[analytics-export] tracking échoué', {
      error: e instanceof Error ? e.message : String(e),
    })
  }

  const fname = `centres-analytics-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`

  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Cache-Control': 'no-store',
    },
  })
}
