import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { auditPiiAccess } from '@/lib/audit'
import { regionLabel } from '@/lib/regions'
import { handicapLabel, zoneLabel } from '@/lib/profil-constants'
import { buildUtilisateurWhere, parseRoleU, parseStatutU, parseRegionU } from '@/lib/loaders/admin-utilisateurs'

const EXPORT_CAP = 5000

function csvCell(v: string): string {
  const s = v ?? ''
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
function roleExport(role: string | null): string {
  if (role == null || role === 'jeune' || role === 'beneficiaire') return 'Bénéficiaire'
  return { conseiller: 'Conseiller', recruteur: 'Recruteur', admin: 'Admin' }[role] ?? role
}

/**
 * Export CSV des utilisateurs (supervision admin · GUIC-701 enrichi). Respecte les filtres
 * de la vue (rôle/statut/région/recherche) + une sélection d'`ids`. Données personnelles →
 * garde admin + journalisation CDP (auditPiiAccess). Colonnes enrichies : rôle, complétude,
 * dernière visite.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } }, { status: 403 })
  }

  const sp = new URL(request.url).searchParams
  const where = buildUtilisateurWhere({
    q: (sp.get('q') ?? '').trim(),
    role: parseRoleU(sp.get('role') ?? undefined),
    statut: parseStatutU(sp.get('statut') ?? undefined),
    region: parseRegionU(sp.get('region') ?? undefined),
  })
  const ids = (sp.get('ids') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  if (ids.length) where.cjsUid = { in: ids }

  const users = await prisma.utilisateur.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: EXPORT_CAP,
    select: {
      cjsUid: true, prenom: true, nom: true, email: true, telephone: true, role: true,
      region: true, commune: true, statut: true, createdAt: true, lastSeenAt: true,
      profil: { select: { zoneHabitation: true, situationHandicap: true, completionScore: true } },
    },
  })

  // E1 — accès PII de masse journalisé (stdout haché + trail audit_logs).
  await auditPiiAccess('export.utilisateurs', session.cjsUid, { count: users.length })

  const header = ['cjs_uid', 'Prénom', 'Nom', 'Email', 'Téléphone', 'Rôle', 'Région', 'Commune', "Zone d'habitation", 'Situation de handicap', 'Complétude', 'Statut', 'Inscrit le', 'Dernière visite']
  const lines = users.map((u) =>
    [
      u.cjsUid,
      u.prenom, u.nom, u.email ?? '', u.telephone ?? '',
      roleExport(u.role),
      u.region ? (regionLabel(u.region) ?? u.region) : '',
      u.commune ?? '',
      zoneLabel(u.profil?.zoneHabitation ?? null) ?? '',
      handicapLabel(u.profil?.situationHandicap ?? null) ?? '',
      u.profil && u.profil.completionScore != null ? `${u.profil.completionScore}%` : '',
      u.statut ?? '',
      u.createdAt.toISOString().slice(0, 10),
      u.lastSeenAt ? u.lastSeenAt.toISOString().slice(0, 10) : '',
    ].map(csvCell).join(','),
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
