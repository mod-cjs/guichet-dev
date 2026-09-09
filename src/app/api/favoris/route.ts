import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { FavoriBodySchema } from '@/lib/validations/opportunite'
import { CARD_SELECT, toListItem, PAGE_SIZE } from '@/lib/opportunites-loader'
import { fireBeneficiaireGraphSync } from '@/lib/ia/graph/fire-sync'
import type { ApiResponse } from '@/types/api'
import type { OpportuniteListItem } from '@/types/opportunite'

// GUIC-20 / GUIC-167 — M3 · Favoris d'opportunités (auth SSO requise).

const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

/** GET /api/favoris — favoris de l'utilisateur, en items de carte, paginés. */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<OpportuniteListItem[]>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `favoris-get:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<OpportuniteListItem[]>>

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1)

  // GUIC-706 — gate de visibilité jeune : masquer les favoris dont le partenaire est
  // suspendu (cohérent avec le détail qui 404). Les offres sans org restent visibles.
  const favWhere = { cjsUid: session.cjsUid, opportunite: { NOT: { org: { statut: 'suspendue' as const } } } }
  const [favoris, total] = await Promise.all([
    prisma.opportuniteFavorite.findMany({
      where: favWhere,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: { opportunite: { select: CARD_SELECT } },
    }),
    prisma.opportuniteFavorite.count({ where: favWhere }),
  ])

  return NextResponse.json({
    data: favoris.map((f) => toListItem(f.opportunite)),
    meta: { total, page, limit: PAGE_SIZE },
  })
}

/** POST /api/favoris — ajoute un favori ; idempotent (200 si déjà présent). */
export async function POST(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 20,
    keyPrefix: `favoris-post:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse>

  const body = await request.json().catch(() => null)
  const parsed = FavoriBodySchema.safeParse(body)
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
    select: { id: true },
  })
  if (!opportunite) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Opportunité introuvable' } },
      { status: 404 },
    )
  }

  const where = {
    cjsUid_opportuniteId: { cjsUid: session.cjsUid, opportuniteId: opportunite.id },
  }
  const existing = await prisma.opportuniteFavorite.findUnique({ where })
  if (existing) return NextResponse.json({ data: existing })

  const favori = await prisma.opportuniteFavorite.create({
    data: { cjsUid: session.cjsUid, opportuniteId: opportunite.id },
  })
  fireBeneficiaireGraphSync(session.cjsUid) // INTERESSE_PAR (signal de reco)
  return NextResponse.json({ data: favori }, { status: 201 })
}
