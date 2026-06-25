import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { logger } from '@/lib/logger'
import { createLivre, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * POST /api/admin/bibliotheque/livres — création d'un livre (supervision admin, GUIC-344).
 * Garde de session ADMIN (isAdminRole). Le catalogue est global (cross-centres).
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
  const session = await getSession(request)
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } }, { status: 403 })
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
    logger.error('[POST /api/admin/bibliotheque/livres] échec', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } }, { status: 500 })
  }
}
