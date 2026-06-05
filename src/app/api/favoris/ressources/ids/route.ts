import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { getRessourceFavoriIds } from '@/lib/loaders/ressources'
import type { ApiResponse } from '@/types/api'

// GUIC-24 — M6 · IDs des ressources favorites de l'utilisateur.
// Set complet (non paginé) : sert à dériver l'état du bookmark sur les cartes.

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse<string[]>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: `ressource-favoris-ids:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<string[]>>

  const ids = await getRessourceFavoriIds(session.cjsUid)
  return NextResponse.json({ data: ids })
}
