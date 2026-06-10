import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'
import { rateLimit } from '@/lib/rate-limit'
import {
  getCentresWithStatusAndHoraires,
  countCentres,
  type CentreWithStatus,
} from '@/lib/loaders/centres'

const MAX_LIMIT = 50
const DEFAULT_LIMIT = 20

/**
 * `GET /api/centres` — liste paginée publique (Wave 2 / GUIC-353).
 *
 * Query params : `region`, `search`, `limit` (max 50), `offset`.
 * Rate-limit : 60/min/IP.
 * Pas d'auth.
 */
export async function GET(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ centres: CentreWithStatus[] }>>> {
  const rl = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: 'centres-list',
  })
  if (rl) return rl

  const { searchParams } = new URL(request.url)
  const region = searchParams.get('region') ?? undefined
  const search = searchParams.get('search') ?? undefined

  let limit = Number(searchParams.get('limit') ?? DEFAULT_LIMIT)
  if (!Number.isFinite(limit) || limit <= 0) limit = DEFAULT_LIMIT
  if (limit > MAX_LIMIT) limit = MAX_LIMIT

  let offset = Number(searchParams.get('offset') ?? 0)
  if (!Number.isFinite(offset) || offset < 0) offset = 0

  const [centres, total] = await Promise.all([
    getCentresWithStatusAndHoraires({ region, search, limit, offset }),
    countCentres({ region, search }),
  ])

  return NextResponse.json({
    data: { centres },
    meta: {
      total,
      limit,
      page: Math.floor(offset / limit) + 1,
      generated_at: new Date().toISOString(),
    },
  })
}

export async function POST(): Promise<NextResponse<ApiResponse>> {
  return NextResponse.json(
    { error: { code: 'NOT_IMPLEMENTED', message: 'À implémenter' } },
    { status: 501 },
  )
}
