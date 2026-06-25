import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { logger } from '@/lib/logger'
import { updateExemplaire, deleteExemplaire, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * PATCH/DELETE /api/admin/bibliotheque/exemplaires/[id] (admin cross-centres, GUIC-344).
 * staffCentreId = null → aucune restriction de centre (l'admin gère tous les centres).
 */
const ExemplairePatchSchema = z.object({
  rayon: z.string().min(1).max(40).optional(),
  etagere: z.string().min(1).max(40).optional(),
  position: z.string().min(1).max(40).optional(),
  statut: z.enum(['disponible', 'indisponible']).optional(),
})

async function requireAdmin(request: NextRequest): Promise<boolean> {
  const session = await getSession(request)
  return !!session && isAdminRole(session.roles)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } }, { status: 403 })
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
    await updateExemplaire(id, null, parsed.data)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    return handle(err, 'PATCH')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } }, { status: 403 })
  }
  const { id } = await params
  try {
    await deleteExemplaire(id, null)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    return handle(err, 'DELETE')
  }
}

function handle(err: unknown, ctx: string): NextResponse<ApiResponse<{ ok: true }>> {
  if (err instanceof BiblioDomainError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
  }
  logger.error(`[/api/admin/bibliotheque/exemplaires/[id]] ${ctx} échec`, { error: err instanceof Error ? err.message : String(err) })
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } }, { status: 500 })
}
