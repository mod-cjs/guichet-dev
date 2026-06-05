import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { ApiResponse } from '@/types/api'

// GUIC-247 — Marquer toutes les notifications de l'utilisateur comme lues.
// Idempotent. Renvoie `{ updated: number }`.

const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ updated: number }>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 10,
    keyPrefix: `notifications-lu-all:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse<{ updated: number }>>

  const result = await prisma.notification.updateMany({
    where: { cjsUid: session.cjsUid, luA: null },
    data: { luA: new Date() },
  })

  return NextResponse.json(
    { data: { updated: result.count } },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
