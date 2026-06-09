/**
 * POST /api/v1/track — endpoint tracking événements KPI fréquentation centres.
 *
 * GUIC-351 / EPIC GUIC-350. Spec : .agent_context/specs/M4-centres-lot7.md §3.4.
 *
 * - Public : pas d'auth requise (anonyme OK pour les events de discovery)
 * - Rate-limit : 60 req/min par cjsUid (ou IP si anonyme)
 * - Body : `{ type, metadata?, centreId?, cjsUid? }` validé Zod
 * - Cache : `no-store` (anti-cache analytics)
 * - Response minimal `{ ok: true }` (HTTP 202 Accepted)
 *
 * Fail-soft : si l'insertion DB échoue côté helper, on retourne quand même
 * 202 (le tracking n'est jamais bloquant pour l'utilisateur).
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimit } from '@/lib/rate-limit'
import {
  trackCentreEvent,
  CentreEventInputSchema,
  CentreEventMetadataTooLarge,
} from '@/lib/analytics/centre-events'
import type { ApiResponse } from '@/types/api'

type TrackResponse = NextResponse<ApiResponse<{ ok: true }>>

export async function POST(request: NextRequest): Promise<TrackResponse> {
  // Rate-limit Redis 60/min par cjsUid si fourni, sinon par IP (fallback rateLimit).
  const limited = await rateLimit(request, {
    windowMs:  60_000,
    max:       60,
    keyPrefix: 'centre-track',
  })
  if (limited) return limited as TrackResponse

  // Parse body JSON
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'JSON body requis' } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Validation Zod
  const parsed = CentreEventInputSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code:    'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Paramètres invalides',
        },
      },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  // Track (fail-soft sur DB error mais throw sur metadata trop large)
  try {
    await trackCentreEvent(parsed.data)
  } catch (err) {
    if (err instanceof CentreEventMetadataTooLarge) {
      return NextResponse.json(
        {
          error: {
            code:    'PAYLOAD_TOO_LARGE',
            message: `Metadata > 2KB (${err.bytes} bytes)`,
          },
        },
        { status: 413, headers: { 'Cache-Control': 'no-store' } },
      )
    }
    // Autre erreur Zod (rare car safeParse plus haut) — 400 défensif
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Données invalides' } },
      { status: 400, headers: { 'Cache-Control': 'no-store' } },
    )
  }

  return NextResponse.json(
    { data: { ok: true as const } },
    { status: 202, headers: { 'Cache-Control': 'no-store' } },
  )
}
