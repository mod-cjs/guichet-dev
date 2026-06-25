import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { logger } from '@/lib/logger'
import { getLivre, BiblioDomainError, type LivreVue } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * GET /api/bibliotheque/livres/[id] — fiche livre + exemplaires disponibles et
 * emplacements (GUIC-342/344). Auth requise.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<{ livre: LivreVue }>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const { id } = await params
  try {
    const livre = await getLivre(id)
    return NextResponse.json({ data: { livre } })
  } catch (err) {
    if (err instanceof BiblioDomainError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.status },
      )
    }
    logger.error('[GET /api/bibliotheque/livres/[id]] échec', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } },
      { status: 500 },
    )
  }
}
