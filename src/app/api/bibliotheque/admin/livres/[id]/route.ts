import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStaffSession } from '@/lib/auth/staff-session'
import { logger } from '@/lib/logger'
import { updateLivre, deleteLivre, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * PATCH /api/bibliotheque/admin/livres/[id] — modifie un livre (GUIC-344).
 * DELETE /api/bibliotheque/admin/livres/[id] — supprime un livre (+ exemplaires en cascade).
 * Auth STAFF.
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ ok: true }>>> {
  const staff = await getStaffSession()
  if (!staff) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentification staff requise' } }, { status: 401 })
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
    return handleBiblioError(err, 'PATCH livre')
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
    await deleteLivre(id)
    return NextResponse.json({ data: { ok: true } })
  } catch (err) {
    return handleBiblioError(err, 'DELETE livre')
  }
}

function handleBiblioError(err: unknown, ctx: string): NextResponse<ApiResponse<{ ok: true }>> {
  if (err instanceof BiblioDomainError) {
    return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
  }
  logger.error(`[/api/bibliotheque/admin/livres/[id]] ${ctx} échec`, {
    error: err instanceof Error ? err.message : String(err),
  })
  return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } }, { status: 500 })
}
