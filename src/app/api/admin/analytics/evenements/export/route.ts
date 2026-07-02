/**
 * GET /api/admin/analytics/evenements/export — GUIC-472.
 * Export CSV des ÉVÉNEMENTS (jeu de données distinct de l'export fréquentation
 * centres). Auth admin + rate-limit 5/min/cjsUid + cap 10000 + CSV-injection guard.
 *
 * Colonnes : Date;Titre;Type;Statut;Centre;Inscrits;Présents;Capacité
 */

import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { recordAudit } from '@/lib/audit'

const HEADER = 'Date;Titre;Type;Statut;Centre;Inscrits;Présents;Capacité'
const ROW_CAP = 10000

/** Neutralise formules CSV (= + - @) + séparateurs `;` `"` sauts de ligne (OWASP). */
export function escapeCsvCell(value: string): string {
  if (!value) return ''
  const cleaned = value.replace(/[;\r\n]/g, ' ').replace(/"/g, "'")
  if (/^[=+\-@]/.test(cleaned)) return `'${cleaned}`
  return cleaned
}

function parseDate(v: string | null, fallback: Date): Date {
  if (!v) return fallback
  const d = new Date(v)
  return Number.isNaN(d.getTime()) ? fallback : d
}

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Admin requis' } }, { status: 403 })
  }

  const limited = await rateLimit(req, {
    windowMs: 60_000,
    max: 5,
    keyPrefix: `admin-analytics-evenements-export:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited

  const sp = req.nextUrl.searchParams
  const now = new Date()
  const from = parseDate(sp.get('from'), new Date(now.getTime() - 30 * 86400_000))
  const to = parseDate(sp.get('to'), now)
  const centreIdParam = sp.get('centreId')
  const centreIds = centreIdParam ? centreIdParam.split(',').filter(Boolean) : []

  const where: { dateDebut: { gte: Date; lte: Date }; centreId?: { in: string[] } } = {
    dateDebut: { gte: from, lte: to },
  }
  if (centreIds.length > 0) where.centreId = { in: centreIds }

  const rows = await prisma.evenement.findMany({
    where,
    select: {
      dateDebut: true,
      titre: true,
      type: true,
      statut: true,
      capaciteMax: true,
      centre: { select: { nom: true } },
      _count: { select: { inscriptions: true } },
      inscriptions: { where: { statut: 'present' }, select: { cjsUid: true } },
    },
    orderBy: { dateDebut: 'asc' },
    take: ROW_CAP,
  })

  const lines = [HEADER]
  for (const e of rows) {
    lines.push(
      [
        e.dateDebut.toISOString().slice(0, 10),
        escapeCsvCell(e.titre),
        escapeCsvCell(String(e.type)),
        escapeCsvCell(String(e.statut)),
        escapeCsvCell(e.centre?.nom ?? ''),
        String(e._count.inscriptions),
        String(e.inscriptions.length),
        escapeCsvCell(e.capaciteMax != null ? String(e.capaciteMax) : ''),
      ].join(';'),
    )
  }
  const body = lines.join('\n') + '\n'

  // Traçabilité — export distinct de celui des centres. recordAudit est fail-soft.
  await recordAudit(session.cjsUid, 'export.evenements', {
    targetType: 'collection',
    meta: { from: from.toISOString(), to: to.toISOString(), rows: rows.length },
  })

  const fname = `evenements-analytics-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv`
  return new NextResponse(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fname}"`,
      'Cache-Control': 'no-store',
    },
  })
}
