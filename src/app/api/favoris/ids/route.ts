import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

// GUIC-20 — M3 · IDs des opportunités favorites de l'utilisateur.
// Set complet (non paginé) : sert à dériver l'état du cœur sur les cartes.

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
    keyPrefix: `favoris-ids:${session.cjsUid}`,
  })
  if (limited) return limited as NextResponse<ApiResponse<string[]>>

  const rows = await prisma.opportuniteFavorite.findMany({
    where: { cjsUid: session.cjsUid },
    select: { opportuniteId: true },
  })

  return NextResponse.json({ data: rows.map((r) => r.opportuniteId) })
}
