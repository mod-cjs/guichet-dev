import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { listRessourcesFavoris } from '@/lib/loaders/ressources'
import type { ApiResponse } from '@/types/api'
import type { RessourceListItem } from '@/lib/loaders/ressources'

// GUIC-24 — M6 · Liste paginée des favoris ressources de l'utilisateur connecté.

const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<RessourceListItem[]>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `ressource-favoris-get:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<RessourceListItem[]>>

  const page = Math.max(1, Number(request.nextUrl.searchParams.get('page')) || 1)
  const { items, total, pageSize } = await listRessourcesFavoris(session.cjsUid, page)

  return NextResponse.json({
    data: items,
    meta: { total, page, limit: pageSize },
  })
}
