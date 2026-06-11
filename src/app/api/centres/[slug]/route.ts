import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types/api'
import { rateLimit } from '@/lib/rate-limit'
import { getCentreBySlug, type CentreDetail } from '@/lib/loaders/centres'

interface RouteParams {
  params: Promise<{ slug: string }>
}

/**
 * `GET /api/centres/[slug]` — détail public d'un centre CJS (Wave 3 / GUIC-357).
 *
 * Rate-limit : 60/min/IP.
 * Pas d'auth.
 * Cache CDN court : `s-maxage=60, stale-while-revalidate=300`.
 */
export async function GET(
  request: NextRequest,
  { params }: RouteParams,
): Promise<NextResponse<ApiResponse<{ centre: CentreDetail }>>> {
  const rl = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: 'centre-detail',
  })
  if (rl) return rl as NextResponse<ApiResponse<{ centre: CentreDetail }>>

  const { slug } = await params
  const centre = await getCentreBySlug(slug)

  if (!centre) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Centre introuvable' } },
      { status: 404 },
    )
  }

  return NextResponse.json(
    {
      data: { centre },
      meta: { generated_at: new Date().toISOString() },
    },
    {
      status: 200,
      headers: {
        'Cache-Control': 's-maxage=60, stale-while-revalidate=300',
      },
    },
  )
}
