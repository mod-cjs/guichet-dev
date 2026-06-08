import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

// GUIC-247 — Marquer une notification comme lue (ownership-guarded).
// Idempotent : déjà lue → 204 sans-op.

const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const { id } = await ctx.params

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: `notifications-lu:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse>

  // updateMany sur clé composée (id + cjsUid) garantit l'ownership :
  // un user ne peut marquer lue qu'une notif qui lui appartient.
  const result = await prisma.notification.updateMany({
    where: { id, cjsUid: session.cjsUid, luA: null },
    data: { luA: new Date() },
  })

  if (result.count === 0) {
    // Soit elle n'existe pas / pas la sienne → 404,
    // soit déjà lue → 204 idempotent.
    const exists = await prisma.notification.findFirst({
      where: { id, cjsUid: session.cjsUid },
      select: { id: true },
    })
    if (!exists) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Notification introuvable' } },
        { status: 404 },
      )
    }
  }

  return new NextResponse(null, { status: 204 })
}
