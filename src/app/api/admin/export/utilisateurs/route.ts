import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { auditPiiAccess } from '@/lib/audit'
import { regionLabel } from '@/lib/regions'
import { handicapLabel, zoneLabel } from '@/lib/profil-constants'

const EXPORT_CAP = 5000

/** Échappe une valeur pour une cellule CSV (RFC 4180). */
function csvCell(v: string): string {
  const s = v ?? ''
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Export CSV des utilisateurs (supervision admin · C3).
 *
 * Données RÉELLES Prisma (remplace le stub `/api/v1/export/utilisateurs` qui
 * renvoyait `[]`). Contient des données personnelles → garde de session admin
 * (et non clé Data Hub) + journalisation CDP de l'accès (E1, `auditPiiAccess`).
 * Minimisation : pas de `cjsUid` (pivot technique inutile à un rapport).
 */
export async function GET() {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
      { status: 403 },
    )
  }

  const users = await prisma.utilisateur.findMany({
    where: { deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take: EXPORT_CAP,
    select: {
      prenom: true,
      nom: true,
      email: true,
      telephone: true,
      region: true,
      commune: true,
      statut: true,
      createdAt: true,
      profil: { select: { zoneHabitation: true, situationHandicap: true } },
    },
  })

  // E1 — accès PII de masse journalisé (stdout haché + trail audit_logs).
  await auditPiiAccess('export.utilisateurs', session.cjsUid, { count: users.length })

  const header = ['Prénom', 'Nom', 'Email', 'Téléphone', 'Région', 'Commune', "Zone d'habitation", 'Situation de handicap', 'Statut', 'Inscrit le']
  const lines = users.map((u) =>
    [
      u.prenom,
      u.nom,
      u.email ?? '',
      u.telephone ?? '',
      u.region ? (regionLabel(u.region) ?? u.region) : '',
      u.commune ?? '',
      zoneLabel(u.profil?.zoneHabitation ?? null) ?? '',
      handicapLabel(u.profil?.situationHandicap ?? null) ?? '',
      u.statut ?? '',
      u.createdAt.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(','),
  )
  const csv = '﻿' + [header.join(','), ...lines].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="utilisateurs-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
