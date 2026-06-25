import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import type { StatutCandidature, Prisma } from '@prisma/client'

const EXPORT_CAP = 5000

const STATUT_LABEL: Record<string, string> = {
  En_attente: 'En attente',
  Vue: 'Vue',
  Retenue: 'Retenue',
  Refusee: 'Refusée',
}

/** Échappe une valeur pour une cellule CSV (RFC 4180). */
function csvCell(v: string): string {
  const s = v ?? ''
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

/**
 * Export CSV des candidatures (supervision admin — GUIC-462).
 * Garde de session admin. Respecte les filtres q/statut de la vue.
 */
export async function GET(request: NextRequest) {
  const session = await getSession()
  if (!session || !session.roles.includes('admin')) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
      { status: 403 },
    )
  }

  const { searchParams } = new URL(request.url)
  const q = (searchParams.get('q') ?? '').trim()
  const statutFilter = searchParams.get('statut') ?? ''

  const where: Prisma.CandidatureWhereInput = {
    ...(q
      ? {
          OR: [
            { utilisateur: { nom: { contains: q } } },
            { utilisateur: { prenom: { contains: q } } },
            { opportunite: { titre: { contains: q } } },
            { opportunite: { organisation: { contains: q } } },
          ],
        }
      : {}),
    ...(statutFilter ? { statut: statutFilter as StatutCandidature } : {}),
  }

  const candidatures = await prisma.candidature.findMany({
    where,
    orderBy: { soumiseA: 'desc' },
    take: EXPORT_CAP,
    select: {
      statut: true,
      soumiseA: true,
      utilisateur: { select: { nom: true, prenom: true, email: true } },
      opportunite: { select: { titre: true, organisation: true, organisationLibelle: true } },
    },
  })

  const header = ['Candidat', 'Email', 'Opportunité', 'Annonceur', 'Statut', 'Soumise le']
  const lines = candidatures.map((c) =>
    [
      `${c.utilisateur.prenom} ${c.utilisateur.nom}`,
      c.utilisateur.email ?? '',
      c.opportunite.titre,
      c.opportunite.organisationLibelle ?? c.opportunite.organisation,
      STATUT_LABEL[c.statut] ?? c.statut,
      c.soumiseA.toISOString().slice(0, 10),
    ]
      .map(csvCell)
      .join(','),
  )
  const csv = '﻿' + [header.join(','), ...lines].join('\r\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="candidatures-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  })
}
