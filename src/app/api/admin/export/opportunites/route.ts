import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'

const EXPORT_CAP = 5000

const STATUT_LABEL: Record<string, string> = {
  brouillon: 'Brouillon',
  publiee: 'Publiée',
  expiree: 'Expirée',
  archivee: 'Archivée',
}

/** Échappe une valeur pour une cellule CSV (RFC 4180). */
function csvCell(v: string): string {
  const s = v ?? ''
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Export CSV des opportunités (supervision admin · C3).
 *
 * Données RÉELLES Prisma (remplace le stub `/api/v1/export/opportunites`).
 * Pas de PII → garde de session admin suffit (pas de journal CDP).
 */
export async function GET() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
      { status: 403 },
    )
  }

  const opportunites = await prisma.opportunite.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: EXPORT_CAP,
    select: {
      titre: true,
      type: true,
      organisation: true,
      organisationLibelle: true,
      statut: true,
      vues: true,
      deadline: true,
      createdAt: true,
    },
  })

  const header = ['Titre', 'Type', 'Annonceur', 'Statut', 'Vues', 'Échéance', 'Créée le']
  const lines = opportunites.map((o) =>
    [
      o.titre,
      String(o.type),
      o.organisationLibelle ?? o.organisation,
      STATUT_LABEL[o.statut] ?? String(o.statut),
      String(o.vues),
      o.deadline ? o.deadline.toISOString().slice(0, 10) : '',
      o.createdAt.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(','),
  )
  const csv = '﻿' + [header.join(','), ...lines].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="opportunites-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
