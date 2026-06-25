import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { isAdminRole } from '@/lib/auth/admin-roles'
import { logger } from '@/lib/logger'
import { confirmerEmprunt, BiblioDomainError, type EmpruntVue } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * POST /api/admin/bibliotheque/emprunts/[id]/confirmer — confirmation par l'admin
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
    const emprunt = await confirmerEmprunt({ empruntId: id, staffCentreId: null, staffCjsUid: session.cjsUid })
    return NextResponse.json({ data: { emprunt } })
  } catch (err) {
    if (err instanceof BiblioDomainError) {
      return NextResponse.json({ error: { code: err.code, message: err.message } }, { status: err.status })
    }
    logger.error('[POST /api/admin/bibliotheque/emprunts/[id]/confirmer] échec', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } }, { status: 500 })
  }
}
