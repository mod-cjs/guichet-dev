import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { loadNotifications } from '@/lib/loaders/notifications'
import type { ApiResponse } from '@/types/api'

// GUIC-247 — API liste des notifications de l'utilisateur connecté.
// Réponse complète (groupes + unread) — pas de pagination pour MVP
// (cap à 200 notifs côté loader, suffisant pour usage in-app).

const UNAUTHORIZED = { code: 'UNAUTHORIZED', message: 'Non authentifié' }

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: UNAUTHORIZED }, { status: 401 })

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: `notifications-get:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse>

  const { groupes, unreadCount } = await loadNotifications(session.cjsUid)

  return NextResponse.json(
    { data: { groupes, unreadCount } },
    { headers: { 'Cache-Control': 'private, no-store' } },
  )
}
