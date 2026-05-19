import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { loadRecentActivity, ACTIVITY_LIMIT_DEFAULT } from '@/lib/dashboard-loader'
import type { ApiResponse } from '@/types/api'
import type { ActivityItem } from '@/types/profil'

export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ items: ActivityItem[] }>>> {
  const session = await getSession(request)
  if (!session) return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } }, { status: 401 })

  const limited = await rateLimit(request, { windowMs: 60_000, max: 30, keyPrefix: `activity:${session.cjsUid}` })
  if (limited) return limited as NextResponse<ApiResponse<{ items: ActivityItem[] }>>

  const raw = request.nextUrl.searchParams.get('limit')
  const parsed = raw ? Number(raw) : NaN
  const limit = Number.isFinite(parsed) ? parsed : ACTIVITY_LIMIT_DEFAULT

  const items = await loadRecentActivity(session.cjsUid, limit)
  return NextResponse.json({ data: { items } })
}
