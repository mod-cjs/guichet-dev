import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { auditPiiAccess } from '@/lib/audit'
import { rateLimit } from '@/lib/rate-limit'
import { buildCandidaturesCsv, type CsvCandidatRow } from '@/lib/recruteur/export-csv'
import type { Prisma } from '@prisma/client'

const EXPORT_CAP = 5000

/**
 * GET /api/recruteur/candidatures/export — export CSV des candidats du recruteur (GUIC-516).
 * Garde `recruteur` + ownership (candidats de ses offres). Filtres `offre`/`q`.
 * Accès PII de masse → journalisé (`export.candidatures`, count) pour la CDP.
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })
  }
  if (!session.roles.includes('recruteur')) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Accès recruteur requis' } }, { status: 403 })
  }

  const limited = await rateLimit(request, { windowMs: 60_000, max: 10, keyPrefix: `recruteur-export:${session.cjsUid}` })
  if (limited) return limited

  const { searchParams } = new URL(request.url)
  const offre = (searchParams.get('offre') ?? '').trim()
  const q = (searchParams.get('q') ?? '').trim()

  // Ownership : offres du recruteur (par uid OU son organisation).
  const org = await prisma.organisation.findFirst({ where: { cjsUid: session.cjsUid }, select: { id: true } })
  const OR: Prisma.OpportuniteWhereInput[] = [{ recruteurUid: session.cjsUid }]
  if (org?.id) OR.push({ organisationId: org.id })

  const rows = await prisma.candidature.findMany({
    where: {
      opportunite: { deletedAt: null, OR, ...(offre ? { id: offre } : {}) },
      ...(q ? { utilisateur: { OR: [{ prenom: { contains: q } }, { nom: { contains: q } }] } } : {}),
    },
    orderBy: [{ favoriRecruteur: 'desc' }, { scoreAdequation: { sort: 'desc', nulls: 'last' } }],
    take: EXPORT_CAP,
    select: {
      pipelineStage: true, statut: true, scoreAdequation: true, soumiseA: true,
      utilisateur: { select: { prenom: true, nom: true, email: true, telephone: true } },
      opportunite: { select: { titre: true } },
    },
  })

  // CDP — accès PII de masse tracé (qui exporte, combien).
  await auditPiiAccess('export.candidatures', session.cjsUid, { count: rows.length, meta: { offre: offre || 'toutes' } })

  const data: CsvCandidatRow[] = rows.map((c) => ({
    prenom: c.utilisateur.prenom,
    nom: c.utilisateur.nom,
    email: c.utilisateur.email,
    telephone: c.utilisateur.telephone,
    offreTitre: c.opportunite.titre,
    pipeline: c.pipelineStage,
    statut: c.statut,
    score: c.scoreAdequation,
    soumiseA: c.soumiseA.toISOString(),
  }))

  return new NextResponse(buildCandidaturesCsv(data), {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="candidats-${new Date().toISOString().slice(0, 10)}.csv"`,
      'Cache-Control': 'private, no-store',
    },
  })
}
