import { NextRequest, NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/auth/staff-session'
import { logger } from '@/lib/logger'
import { confirmerEmprunt, BiblioDomainError, type EmpruntVue } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * POST /api/bibliotheque/emprunts/[id]/confirmer — confirmation au centre par le
 * bibliothécaire (staff) lors du scan du badge (GUIC-343). `initie` → `en_cours`.
 *
 * Auth STAFF (cookie session staff). RBAC : le staff ne peut confirmer que les
 * exemplaires de SON centre (vérifié dans le service).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ emprunt: EmpruntVue }>>> {
  const staff = await getStaffSession()
  if (!staff) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Authentification staff requise' } },
      { status: 401 },
    )
  }

  const { id } = await params
  try {
    const emprunt = await confirmerEmprunt({ empruntId: id, staffCentreId: staff.centreId })
    return NextResponse.json({ data: { emprunt } })
  } catch (err) {
    if (err instanceof BiblioDomainError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      )
    }
    logger.error('[POST /api/bibliotheque/emprunts/[id]/confirmer] échec', {
      error: err instanceof Error ? err.message : String(err),
      empruntId: id,
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } },
      { status: 500 },
    )
  }
}
