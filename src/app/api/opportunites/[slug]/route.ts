import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getOpportuniteDetail, incrementVue } from '@/lib/opportunites-loader'
import type { ApiResponse } from '@/types/api'
import type { OpportuniteDetail } from '@/types/candidature'

// GUIC-21 — M3 · Détail public d'une opportunité, routé par slug (SEO).

type DetailResponse = NextResponse<ApiResponse<OpportuniteDetail>>

/** IP cliente — `x-real-ip` (injecté par le proxy) puis `x-forwarded-for`. */
function clientIp(request: NextRequest): string {
  const real = request.headers.get('x-real-ip')
  if (real) return real.trim()
  const fwd = request.headers.get('x-forwarded-for')
  return fwd?.split(',')[0]?.trim() || 'no-ip'
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
): Promise<DetailResponse> {
  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: 'opportunite-detail',
  })
  if (limited) return limited as DetailResponse

  const { slug } = await params
  const detail = await getOpportuniteDetail(slug)

  if (!detail) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Opportunité introuvable' } },
      { status: 404 },
    )
  }

  // Compteur de vues — best-effort, n'échoue jamais la réponse.
  await incrementVue(slug, clientIp(request))

  return NextResponse.json({ data: detail })
}
