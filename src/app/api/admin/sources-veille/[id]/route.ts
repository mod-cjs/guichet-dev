import { NextRequest, NextResponse } from 'next/server'
import { Prisma, type SourceVeille } from '@prisma/client'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/audit'
import { logger } from '@/lib/logger'
import {
  SourceVeilleUpdateSchema,
  methodeConfigCoherentes,
  type MethodeExtraction,
} from '@/lib/curation/sources-veille-schema'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-596 — US-1 Gestion des sources de veille : détail / édition / suppression.
 *
 * GET    → 200 · 401/403 · 404 (soft-deleted = introuvable)
 * PATCH  → 200 patch partiel (toggle actif inclus) · 400 · 404 · 409 URL prise
 * DELETE → 200 soft-delete (`deletedAt`) · 404
 *
 * L'invariant méthode↔config est vérifié sur l'état FUSIONNÉ (DB + patch), pas sur
 * le seul payload : basculer la méthode d'une source déjà configurée reste légal.
 * RBAC admin, mutations journalisées (audit_logs).
 */

type Ctx = { params: Promise<{ id: string }> }

async function gardeAdmin(): Promise<{ cjsUid: string } | NextResponse<ApiResponse<never>>> {
  const session = await getSession()
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { error: { code: 'UNAUTHENTICATED', message: 'Authentification requise' } },
      { status: 401 },
    )
  }
  if (!isAdminRole(session.roles)) {
    return NextResponse.json<ApiResponse<never>>(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } },
      { status: 403 },
    )
  }
  return { cjsUid: session.cjsUid }
}

function notFound() {
  return NextResponse.json(
    { error: { code: 'NOT_FOUND', message: 'Source introuvable' } },
    { status: 404 },
  )
}

async function findVivante(id: string): Promise<SourceVeille | null> {
  return prisma.sourceVeille.findFirst({ where: { id, deletedAt: null } })
}

export async function GET(
  _request: NextRequest,
  context: Ctx,
): Promise<NextResponse<ApiResponse<SourceVeille>>> {
  const garde = await gardeAdmin()
  if (garde instanceof NextResponse) return garde

  const { id } = await context.params
  const source = await findVivante(id)
  if (!source) return notFound()

  return NextResponse.json({ data: source })
}

export async function PATCH(
  request: NextRequest,
  context: Ctx,
): Promise<NextResponse<ApiResponse<SourceVeille>>> {
  const garde = await gardeAdmin()
  if (garde instanceof NextResponse) return garde

  const { id } = await context.params
  const existante = await findVivante(id)
  if (!existante) return notFound()

  const parsed = SourceVeilleUpdateSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }

  const { configExtraction, ...rest } = parsed.data

  // Invariant méthode↔config sur l'ENTITÉ RÉSULTANTE (état en base + patch).
  const methodeFinale = (rest.methode ?? existante.methode) as MethodeExtraction
  const configFinale =
    configExtraction === undefined ? existante.configExtraction : configExtraction
  if (!methodeConfigCoherentes(methodeFinale, configFinale)) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: `configExtraction est requise pour la méthode « ${methodeFinale} »`,
        },
      },
      { status: 400 },
    )
  }

  const data: Prisma.SourceVeilleUpdateInput = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  )
  // `null` explicite = effacement ; `undefined` = champ non touché.
  if (configExtraction !== undefined) {
    data.configExtraction =
      configExtraction === null
        ? Prisma.JsonNull
        : (configExtraction as Prisma.InputJsonValue)
  }
  // Réactivation : reposer une date d'échéance si le robot avait consommé la précédente,
  // sinon une source réactivée resterait invisible au crawler US-2.
  if (rest.actif === true && !existante.actif && existante.prochaineVerifLe === null) {
    data.prochaineVerifLe = new Date()
  }

  try {
    const source = await prisma.sourceVeille.update({ where: { id }, data })
    await recordAudit(garde.cjsUid, 'source_veille.update', {
      targetType: 'source_veille',
      targetId: id,
      meta: { champs: Object.keys(parsed.data) },
    })
    return NextResponse.json({ data: source })
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return NextResponse.json(
        { error: { code: 'URL_EXISTANTE', message: 'Cette URL est déjà déclarée comme source.' } },
        { status: 409 },
      )
    }
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2003') {
      return NextResponse.json(
        { error: { code: 'TYPE_INCONNU', message: 'Type d’opportunité par défaut inconnu.' } },
        { status: 400 },
      )
    }
    logger.error('[PATCH /api/admin/sources-veille/[id]] échec', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } },
      { status: 500 },
    )
  }
}

export async function DELETE(
  _request: NextRequest,
  context: Ctx,
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const garde = await gardeAdmin()
  if (garde instanceof NextResponse) return garde

  const { id } = await context.params
  const source = await findVivante(id)
  if (!source) return notFound()

  await prisma.sourceVeille.update({ where: { id }, data: { deletedAt: new Date() } })
  await recordAudit(garde.cjsUid, 'source_veille.delete', {
    targetType: 'source_veille',
    targetId: id,
    meta: { url: source.url },
  })
  return NextResponse.json({ data: { id } })
}
