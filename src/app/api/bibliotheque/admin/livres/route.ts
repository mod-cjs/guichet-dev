import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getStaffSession } from '@/lib/auth/staff-session'
import { logger } from '@/lib/logger'
import { createLivre, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * POST /api/bibliotheque/admin/livres — création d'un livre au catalogue (GUIC-344).
 * Auth STAFF (bibliothécaire). Le catalogue est mutualisé (pas de scoping centre sur
 * le livre lui-même ; le scoping est porté par les exemplaires).
 */
const LivreSchema = z.object({
  titre: z.string().min(1).max(300),
  auteur: z.string().min(1).max(200),
  isbn: z.string().max(20).optional().nullable(),
  theme: z.string().min(1).max(120),
  niveau: z.string().max(60).optional().nullable(),
  langue: z.string().max(40).optional(),
  resume: z.string().max(5000).optional().nullable(),
  couvertureUrl: z.string().url().max(500).optional().nullable(),
})

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const staff = await getStaffSession()
  if (!staff) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentification staff requise' } },
      { status: 401 },
    )
  }
  const parsed = LivreSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }
  try {
    const created = await createLivre(parsed.data)
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    if (err instanceof BiblioDomainError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
    }
    logger.error('[POST /api/bibliotheque/admin/livres] échec', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } },
      { status: 500 },
    )
  }
}
