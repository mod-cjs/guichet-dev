import { NextRequest, NextResponse } from 'next/server'
import type { Domaine, Region, TypeOpportunite } from '@prisma/client'
import { rateLimit } from '@/lib/rate-limit'
import { listOpportunites } from '@/lib/opportunites-loader'
import { OpportuniteQuerySchema } from '@/lib/validations/opportunite'
import type { ApiResponse } from '@/types/api'
import type { OpportuniteListItem } from '@/types/opportunite'

// GUIC-20 — M3 · Catalogue public des opportunités.
// Endpoint public : rate-limit Redis ; le cache 5 min est géré par le loader.

type ListResponse = NextResponse<ApiResponse<OpportuniteListItem[]>>

export async function GET(request: NextRequest): Promise<ListResponse> {
  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: 'opportunites-list',
  })
  if (limited) return limited as ListResponse

  const parsed = OpportuniteQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams),
  )
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Paramètres invalides',
        },
      },
      { status: 400 },
    )
  }

  const { q, domaine, type, region, page, sort_by } = parsed.data

  const result = await listOpportunites({
    q,
    domaine: domaine as Domaine | undefined,
    type: type as TypeOpportunite | undefined,
    region: region as Region | undefined,
    page,
    sortBy: sort_by,
  })

  return NextResponse.json({
    data: result.items,
    meta: { total: result.total, page: result.page, limit: result.pageSize },
  })
}
