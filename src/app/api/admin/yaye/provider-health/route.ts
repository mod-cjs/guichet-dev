import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { canManageYaye } from '@/lib/ia/admin/rbac'
import { rateLimit } from '@/lib/rate-limit'
import { pingTousSlots, type ProviderPing } from '@/lib/ia/admin/provider-health'
import type { ApiResponse } from '@/types/api'

// POST /api/admin/yaye/provider-health (GUIC-558) — sonde LIVE le fournisseur LLM des 3 slots.
// Déclenchement admin explicite uniquement : chaque appel coûte de vrais tokens → garde de
// session + rate-limit serré. Ne rend jamais 500 sur un fournisseur en panne : l'état
// « down » est une réponse 200 avec ok=false par slot.

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<{ slots: ProviderPing[]; testeA: string }>>> {
  const session = await getSession()
  if (!session || !canManageYaye(session.roles)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès réservé au staff (admin, directeur, conseiller)' } },
      { status: 403 },
    )
  }

  // Un ping = 3 appels payants → 10 tests / 5 min / staff (authentifié).
  const limited = await rateLimit(request, {
    keyPrefix: 'yaye-provider-health',
    authenticated: true,
    windowMs: 5 * 60_000,
    max: 10,
  })
  if (limited) return limited as NextResponse<ApiResponse<{ slots: ProviderPing[]; testeA: string }>>

  const slots = await pingTousSlots()
  return NextResponse.json({ data: { slots, testeA: new Date().toISOString() } })
}
