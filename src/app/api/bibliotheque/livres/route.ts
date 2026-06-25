import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { searchLivres, type SearchLivresResult } from '@/lib/bibliotheque/service'
import type { ApiResponse } from '@/types/api'

/**
 * GET /api/bibliotheque/livres — recherche de livres (GUIC-342).
 *
 * Query : `q` (titre/auteur/ISBN), `theme`, `niveau`, `centreId`, `page`.
 * Auth requise · rate-limit 30/min. Retourne les livres + nombre d'exemplaires
 * disponibles + leurs emplacements physiques.
 *
 * Spec : .agent_context/specs/M4-bibliotheque.md §3.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<SearchLivresResult>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `biblio-search:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse<SearchLivresResult>>

  const sp = request.nextUrl.searchParams
  const pageRaw = Number(sp.get('page') ?? '1')
  try {
    const result = await searchLivres({
      q: sp.get('q') ?? undefined,
      theme: sp.get('theme') ?? undefined,
      niveau: sp.get('niveau') ?? undefined,
      centreId: sp.get('centreId') ?? undefined,
      page: Number.isFinite(pageRaw) ? pageRaw : 1,
    })
    return NextResponse.json({
      data: result,
      meta: { total: result.total, page: result.page, pageSize: result.pageSize },
    })
  } catch (err) {
    logger.error('[GET /api/bibliotheque/livres] échec', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } },
      { status: 500 },
    )
  }
}
