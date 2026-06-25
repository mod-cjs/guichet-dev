import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { logger } from '@/lib/logger'
import { updateLivre, deleteLivre, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * PATCH/DELETE /api/admin/bibliotheque/livres/[id] — édition/suppression (admin, GUIC-344).
 */
const LivrePatchSchema = z.object({
  titre: z.string().min(1).max(300).optional(),
  auteur: z.string().min(1).max(200).optional(),
  isbn: z.string().max(20).optional().nullable(),
  theme: z.string().min(1).max(120).optional(),
  niveau: z.string().max(60).optional().nullable(),
  langue: z.string().max(40).optional(),
  resume: z.string().max(5000).optional().nullable(),
  couvertureUrl: z.string().url().max(500).optional().nullable(),
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
  const parsed = LivrePatchSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }
  try {
    await updateLivre(id, parsed.data)
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
    await deleteLivre(id)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    return handle(err, 'DELETE')
  }
}

function handle(err: unknown, ctx: string): NextResponse<ApiResponse<{ ok: true }>> {
  if (err instanceof BiblioDomainError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
  }
  logger.error(`[/api/admin/bibliotheque/livres/[id]] ${ctx} échec`, { error: err instanceof Error ? err.message : String(err) })
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } }, { status: 500 })
}
