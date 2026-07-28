import { NextRequest, NextResponse } from 'next/server'
import { Domaine, Region, TypeOpportunite } from '@prisma/client'
import { rateLimit } from '@/lib/rate-limit'
import { listOpportunites } from '@/lib/opportunites-loader'
import { OpportuniteQuerySchema } from '@/lib/validations/opportunite'
import type { ApiResponse } from '@/types/api'
import type { OpportuniteListItem } from '@/types/opportunite'

// GUIC-20 — M3 · Catalogue public des opportunités.
// Endpoint public : rate-limit Redis ; le cache 5 min est géré par le loader.
// GUIC-256 : multi-select via URL `?type=A&type=B&domaine=X&domaine=Y&region=R1&region=R2`.

type ListResponse = NextResponse<ApiResponse<OpportuniteListItem[]>>

/**
 * Récupère toutes les valeurs d'un searchParam et les whitelist contre
 * une enum Prisma. Rétro-compat : `?type=A` (single) → `['A']`.
 * Valeurs invalides silencieusement ignorées (pas de 400 — UX dégrade gracieux).
 */
function parseMultiEnumParam<T extends string>(
  sp: URLSearchParams,
  key: string,
  enumValues: Record<string, T>,
): T[] {
  const valid = new Set<string>(Object.values(enumValues))
  return sp
    .getAll(key)
    .filter((v) => valid.has(v))
    .map((v) => v as T)
}

export async function GET(request: NextRequest): Promise<ListResponse> {
  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 60,
    keyPrefix: 'opportunites-list',
  })
  if (limited) return limited as ListResponse

  const sp = request.nextUrl.searchParams

  // Zod valide q/page/sort_by — type/domaine/region parsés à la main pour multi.
  const parsed = OpportuniteQuerySchema.safeParse({
    q: sp.get('q') ?? undefined,
    page: sp.get('page') ?? undefined,
    sort_by: sp.get('sort_by') ?? undefined,
  })
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

  const types = parseMultiEnumParam(sp, 'type', TypeOpportunite)
  const domaines = parseMultiEnumParam(sp, 'domaine', Domaine)
  const regions = parseMultiEnumParam(sp, 'region', Region)
  // GUIC-684 — les programmes ne sont pas un enum Prisma (table de référence) :
  // on borne la saisie (slug court, charset strict) plutôt que de valider par enum.
  const programmes = sp
    .getAll('programme')
    .map((v) => v.trim().toLowerCase())
    .filter((v) => /^[a-z0-9-]{1,40}$/.test(v))

  const { q, page, sort_by } = parsed.data

  const result = await listOpportunites({
    q,
    type: types.length === 0 ? undefined : types.length === 1 ? types[0] : types,
    domaine: domaines.length === 0 ? undefined : domaines.length === 1 ? domaines[0] : domaines,
    region: regions.length === 0 ? undefined : regions.length === 1 ? regions[0] : regions,
    programme:
      programmes.length === 0 ? undefined : programmes.length === 1 ? programmes[0] : programmes,
    page,
    sortBy: sort_by,
  })

  return NextResponse.json({
    data: result.items,
    meta: { total: result.total, page: result.page, limit: result.pageSize },
  })
}
