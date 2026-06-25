import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { logger } from '@/lib/logger'
import { retournerEmprunt, BiblioDomainError, type EmpruntVue } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * POST /api/admin/bibliotheque/emprunts/[id]/retour — retour enregistré par l'admin
 * (cross-centres, GUIC-344). staffCentreId = null → aucune restriction de centre.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ emprunt: EmpruntVue }>>> {
  const session = await getSession(request)
  if (!session || !isAdminRole(session.roles)) {
    return NextResponse.json({ error: { code: 'FORBIDDEN', message: 'Accès réservé aux administrateurs' } }, { status: 403 })
  }
  const { id } = await params
  try {
    const emprunt = await retournerEmprunt({ empruntId: id, staffCentreId: null })
    return NextResponse.json({ data: { emprunt } })
  } catch (err) {
    if (err instanceof BiblioDomainError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
    }
    logger.error('[POST /api/admin/bibliotheque/emprunts/[id]/retour] échec', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } }, { status: 500 })
  }
}
