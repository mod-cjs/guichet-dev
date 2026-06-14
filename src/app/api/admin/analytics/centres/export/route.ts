/**
 * GET /api/admin/analytics/centres/export — Lot 7 Wave 6.3 / GUIC-388.
 * Hardening GUIC-389 :
 *  - Rate-limit Redis 5/min/cjsUid (export coûteux + sensible).
 *  - Cap `take: 10000` sur le findMany (évite DoS mémoire).
 *  - CSV-injection guard : préfixe `'` si la valeur commence par
 *    `=` `+` `-` `@` (RFC + OWASP CSV injection).
 *  - Échappe `"` `;` `\n` `\r` dans les cellules.
 *
 * Streame un CSV des réservations sur la fenêtre temporelle filtrée.
 * Auth admin requise (cookie session SSO + role `admin`).
 *
 * Colonnes : Date;Centre;Ressource;Statut;Personnes
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { trackCentreEvent } from '@/lib/analytics/centre-events'
import { logger } from '@/lib/logger'

const HEADER = 'Date;Centre;Ressource;Statut;Personnes'
const ROW_CAP = 10000

/**
 * Neutralise les formules CSV potentielles (= + - @) ET les séparateurs
 * `;` / `"` / sauts de ligne. Préfixe `'` est la mitigation OWASP
 * recommandée pour CSV injection.
 */
export function escapeCsvCell(value: string): string {
  if (!value) return ''
  const cleaned = value
    .replace(/[;\r\n]/g, ' ')
    .replace(/"/g, "'")
  // CSV injection : Excel/LibreOffice évalueraient les cellules commençant
  // par = + - @ comme des formules. On préfixe `'` pour neutraliser.
  if (/^[=+\-@]/.test(cleaned)) {
    return `'${cleaned}`
  }
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

  // GUIC-389 : rate-limit 5/min/cjsUid — export coûteux et sensible.
  const limited = await rateLimit(req, {
    windowMs: 60_000,
    max: 5,
    keyPrefix: `admin-analytics-export:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited

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
    take: ROW_CAP,
  })

  const lines = [HEADER]
  for (const r of rows) {
    lines.push(
      [
        r.dateReservee.toISOString().slice(0, 10),
        escapeCsvCell(r.centre?.nom ?? ''),
        escapeCsvCell(r.ressource?.nom ?? ''),
        escapeCsvCell(String(r.statut)),
        escapeCsvCell(String(r.nombrePersonnes)),
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
