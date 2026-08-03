import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { fireBeneficiaireGraphSync } from '@/lib/ia/graph/fire-sync'
import type { ApiResponse } from '@/types/api'

// GUIC-20 / GUIC-167 — M3 · Suppression d'un favori d'opportunité.

/**
 * DELETE /api/favoris/[opportuniteId] — retire le favori.
 * Ownership implicite (clé `cjsUid` de session). Idempotent : 204 même si
 * le favori n'existait pas.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ opportuniteId: string }> },
): Promise<NextResponse<ApiResponse> | NextResponse> {
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
    keyPrefix: `favoris-del:${session.cjsUid}`,
  })
  if (limited) return limited

  const { opportuniteId } = await params

  await prisma.opportuniteFavorite.deleteMany({
    where: { cjsUid: session.cjsUid, opportuniteId },
  })
  fireBeneficiaireGraphSync(session.cjsUid) // purge l'arête INTERESSE_PAR devenue fantôme

  return new NextResponse(null, { status: 204 })
}
