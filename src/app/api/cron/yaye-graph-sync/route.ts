/**
 * GUIC-259 / GUIC-279 — Cron : reprojection complète Prisma → Neo4j du Knowledge
 * Graph de Yaye (filet de sécurité idempotent). À planifier 1×/nuit via `vercel.json`.
 *
 * Invariant : Neo4j = read-model reconstructible. Cette reprojection rejoue toute
 * la projection (MERGE) → corrige toute dérive de la voie événementielle.
 * No-op si Neo4j non configuré (le fallback Prisma est alors la source directe).
 *
 * Auth : Bearer `CRON_SECRET` (header `Authorization`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { reprojectAll } from '@/lib/ia/graph/projection/project'
import type { ApiResponse } from '@/types/api'

// Reprojection complète : peut être longue sur gros volumes.
export const maxDuration = 300

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization')

  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non autorisé' } },
      { status: 401 },
    )
  }

  try {
    const report = await reprojectAll({ wipe: false })
    logger.info('cron/yaye-graph-sync ok', {
      backend: report.backend,
      durationMs: report.durationMs,
      noeuds: Object.values(report.nodes).reduce((a, b) => a + b, 0),
      relations: Object.values(report.relations).reduce((a, b) => a + b, 0),
    })
    return NextResponse.json({ data: report })
  } catch (err) {
    logger.error('cron/yaye-graph-sync failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'GRAPH_SYNC_FAILED', message: 'Reprojection échouée' } },
      { status: 500 },
    )
  }
}
