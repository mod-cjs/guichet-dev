import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStaffSession } from '@/lib/auth/staff-session'
import { logger } from '@/lib/logger'
import { updateExemplaire, deleteExemplaire, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * PATCH /api/bibliotheque/admin/exemplaires/[id] — emplacement / statut (GUIC-344).
 * DELETE /api/bibliotheque/admin/exemplaires/[id] — retire un exemplaire.
 * Auth STAFF · RBAC : exemplaires de SON centre uniquement (vérifié dans le service).
 */
const ExemplairePatchSchema = z.object({
  rayon: z.string().min(1).max(40).optional(),
  etagere: z.string().min(1).max(40).optional(),
  position: z.string().min(1).max(40).optional(),
  statut: z.enum(['disponible', 'indisponible']).optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const staff = await getStaffSession()
  if (!staff) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentification staff requise' } }, { status: 401 })
  }
  const { id } = await params
  const parsed = ExemplairePatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }
  try {
    await updateExemplaire(id, staff.centreId, parsed.data)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    return handleExemplaireError(err, 'PATCH')
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const staff = await getStaffSession()
  if (!staff) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentification staff requise' } }, { status: 401 })
  }
  const { id } = await params
  try {
    await deleteExemplaire(id, staff.centreId)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    return handleExemplaireError(err, 'DELETE')
  }
}

function handleExemplaireError(err: unknown, ctx: string): NextResponse<ApiResponse<{ ok: true }>> {
  if (err instanceof BiblioDomainError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
  }
  logger.error(`[/api/bibliotheque/admin/exemplaires/[id]] ${ctx} échec`, {
    error: err instanceof Error ? err.message : String(err),
  })
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } }, { status: 500 })
}
