import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import { getOpportuniteDetail } from '@/lib/opportunites-loader'
import { canalFromSrc, trackConsultation } from '@/lib/analytics/consultations'
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

  // Consultation — best-effort, n'échoue jamais la réponse (GUIC-688).
  await trackConsultation({
    typeEntite: 'opportunite',
    entiteId:   detail.id,
    typeEvent:  'consultation',
    canal:      canalFromSrc(request.nextUrl.searchParams.get('src')),
    ip:         clientIp(request),
    userAgent:  request.headers.get('user-agent')?.slice(0, 512) || undefined,
  })

  return NextResponse.json({ data: detail })
}
