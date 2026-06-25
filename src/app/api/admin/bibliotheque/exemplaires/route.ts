import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { logger } from '@/lib/logger'
import { createExemplaire, BiblioDomainError } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * POST /api/admin/bibliotheque/exemplaires — ajoute un exemplaire dans un centre CHOISI
 * (admin cross-centres, GUIC-344). Le `centreId` vient du body (sélecteur de centre).
 * Garde de session ADMIN.
 */
const ExemplaireSchema = z.object({
  livreId: z.string().uuid(),
  centreId: z.string().uuid(),
  codeBarre: z.string().min(1).max(64),
  rayon: z.string().min(1).max(40),
  etagere: z.string().min(1).max(40),
  position: z.string().min(1).max(40),
})

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ id: string }>>> {
  const session = await getSession(request)
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } }, { status: 403 })
  }
  const parsed = ExemplaireSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message ?? 'Données invalides' } },
      { status: 400 },
    )
  }
  try {
    const created = await createExemplaire(parsed.data)
    return NextResponse.json({ data: created }, { status: 201 })
  } catch (err) {
    if (err instanceof BiblioDomainError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
    }
    logger.error('[POST /api/admin/bibliotheque/exemplaires] échec', { error: err instanceof Error ? err.message : String(err) })
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } }, { status: 500 })
  }
}
