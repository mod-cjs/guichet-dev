import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStaffSession } from '@/lib/auth/staff-session'
import { logger } from '@/lib/logger'
import { createExemplaire, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * POST /api/bibliotheque/admin/exemplaires — ajoute un exemplaire physique à un livre
 * dans LE centre du bibliothécaire connecté (GUIC-344). Auth STAFF. Le `centreId` est
 * imposé par la session staff (jamais pris du body → pas d'écriture cross-centre).
 */
const ExemplaireSchema = z.object({
  livreId: z.string().uuid(),
  codeBarre: z.string().min(1).max(64),
  rayon: z.string().min(1).max(40),
  etagere: z.string().min(1).max(40),
  position: z.string().min(1).max(40),
})

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const staff = await getStaffSession()
  if (!staff) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Authentification staff requise' } }, { status: 401 })
  }
  const parsed = ExemplaireSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }
  try {
    const created = await createExemplaire({ ...parsed.data, centreId: staff.centreId })
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    if (err instanceof BiblioDomainError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
    }
    logger.error('[POST /api/bibliotheque/admin/exemplaires] échec', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } }, { status: 500 })
  }
}
