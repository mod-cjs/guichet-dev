import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type SourceVeille } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import { SourceVeilleCreateSchema } from '@/lib/curation/sources-veille-schema'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-596 — US-1 Gestion des sources de veille (curation, épic GUIC-595).
 *
 * GET  /api/admin/sources-veille — liste paginée 20/page, hors soft-deleted.
 * POST /api/admin/sources-veille — création (zod), URL unique (409), audit.
 *
 * RBAC admin sur tout. Aucun fetch réseau ici : le robot est l'US-2 (GUIC-597).
 * Spec : `.agent_context/specs/M3-curation-opportunites.md` §4.
 */

const PAGE_SIZE = 20

function forbidden() {
  return NextResponse.json(
    { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
    { status: 403 },
  )
}

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SourceVeille[]>>> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) return forbidden()

  const pageParam = Number(request.nextUrl.searchParams.get('page') ?? '1')
  const page = Number.isInteger(pageParam) && pageParam >= 1 ? pageParam : 1

  const where = { deletedAt: null }
  const [total, sources] = await prisma.$transaction([
    prisma.sourceVeille.count({ where }),
    prisma.sourceVeille.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ])

  return NextResponse.json({ data: sources, meta: { total, page, limit: PAGE_SIZE } })
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SourceVeille>>> {
  const session = await getSession()
  if (!session || !isAdminRole(session.roles)) return forbidden()

  const parsed = SourceVeilleCreateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const { configExtraction, ...rest } = parsed.data
  try {
    const source = await prisma.sourceVeille.create({
      data: {
        ...rest,
        ...(configExtraction ? { configExtraction: configExtraction as Prisma.InputJsonValue } : {}),
      },
    })
    await recordAudit(session.cjsUid, 'source_veille.create', {
      targetType: 'source_veille',
      targetId: source.id,
      meta: { url: source.url, methode: source.methode },
    })
    return NextResponse.json({ data: source }, { status: 201 })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: { code: 'URL_EXISTANTE', message: 'Cette URL est déjà déclarée comme source.' } },
        { status: 409 },
      )
    }
    logger.error('[POST /api/admin/sources-veille] échec', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } },
      { status: 500 },
    )
  }
}
