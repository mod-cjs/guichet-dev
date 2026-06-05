/**
 * GUIC-218 — `GET /api/opportunites/[slug]/ma-candidature`
 *
 * Vérifie si l'utilisateur connecté a déjà candidaté à l'opportunité donnée.
 * Remplace (à terme) l'usage de `GET /api/candidatures` côté `OpportuniteDetail`
 * qui chargeait toute la liste pour répondre à une simple question booléenne.
 *
 * Auth : SSO obligatoire (cookie httpOnly).
 * Rate-limit : 30/min/cjsUid (`authenticated: true`).
 * Réponse : 200 `{ exists: boolean, statut?: string }`.
 */
import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

interface MaCandidatureResponse {
  exists: boolean
  statut?: string
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ slug: string }> },
): Promise<NextResponse<ApiResponse<MaCandidatureResponse>>> {
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
    keyPrefix: `ma-candidature:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse<MaCandidatureResponse>>

  const { slug } = await context.params

  const candidature = await prisma.candidature.findFirst({
    where: {
      cjsUid: session.cjsUid,
      opportunite: { slug },
    },
    select: { statut: true },
  })

  const data: MaCandidatureResponse = candidature
    ? { exists: true, statut: candidature.statut }
    : { exists: false }

  return NextResponse.json(
    { data },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
