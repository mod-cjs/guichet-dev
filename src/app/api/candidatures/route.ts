import { NextRequest, NextResponse, after } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { CandidatureBodySchema } from '@/lib/validations/candidature'
import { notifyCandidatureConfirmee } from '@/lib/notifications'
import type { ApiResponse } from '@/types/api'
import type { CandidatureListItem } from '@/types/candidature'

// GUIC-21 — M3 · Candidatures (auth SSO requise).

const PAGE_SIZE = 20
const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

/** GET /api/candidatures — candidatures de l'utilisateur connecté, paginées. */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<CandidatureListItem[]>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `candidatures-get:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<CandidatureListItem[]>>

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1)

  const [rows, total] = await Promise.all([
    prisma.candidature.findMany({
      where: { cjsUid: session.cjsUid },
      orderBy: { soumiseA: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        statut: true,
        soumiseA: true,
        opportunite: { select: { slug: true, titre: true, organisation: true } },
      },
    }),
    prisma.candidature.count({ where: { cjsUid: session.cjsUid } }),
  ])

  const data: CandidatureListItem[] = rows.map((c) => ({
    id: c.id,
    opportuniteSlug: c.opportunite.slug,
    opportuniteTitre: c.opportunite.titre,
    organisation: c.opportunite.organisation,
    statut: c.statut,
    soumiseA: c.soumiseA.toISOString(),
  }))

  return NextResponse.json({ data, meta: { total, page, limit: PAGE_SIZE } })
}

/** POST /api/candidatures — soumet une candidature ; 409 si doublon. */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 10,
    keyPrefix: `candidatures-post:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse>

  const body = await request.json().catch(() => null)
  const parsed = CandidatureBodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Données invalides',
        },
      },
      { status: 400 },
    )
  }

  const opportunite = await prisma.opportunite.findUnique({
    where: { id: parsed.data.opportuniteId },
    select: { id: true, titre: true, organisation: true, statut: true, deletedAt: true, deadline: true },
  })
  if (!opportunite || opportunite.deletedAt) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Opportunité introuvable' } },
      { status: 404 },
    )
  }
  const expiree = opportunite.deadline !== null && opportunite.deadline < new Date()
  if (opportunite.statut !== 'publiee' || expiree) {
    return NextResponse.json(
      {
        error: {
          code: 'OPPORTUNITE_FERMEE',
          message: 'Cette opportunité n’accepte plus de candidatures',
        },
      },
      { status: 422 },
    )
  }

  let candidature
  try {
    candidature = await prisma.candidature.create({
      data: {
        cjsUid: session.cjsUid,
        opportuniteId: opportunite.id,
        lettreMotivation: parsed.data.lettreMotivation ?? null,
        notificationsConsent: parsed.data.notificationsConsent,
      },
    })
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json(
        { error: { code: 'ALREADY_APPLIED', message: 'Vous avez déjà postulé à cette opportunité' } },
        { status: 409 },
      )
    }
    throw err
  }

  // Confirmation multi-canal — post-réponse, n'impacte jamais le 201.
  const created = candidature
  after(async () => {
    try {
      await notifyCandidatureConfirmee(
        {
          eventId: `candidature:${created.id}`,
          prenom: session.prenom,
          telephone: session.telephone,
          opportuniteTitre: opportunite.titre,
          organisation: opportunite.organisation,
        },
        parsed.data.notificationsConsent,
      )
    } catch (err) {
      logger.error('[candidatures] dispatch des notifications échoué', { err })
    }
  })

  return NextResponse.json({ data: candidature }, { status: 201 })
}
