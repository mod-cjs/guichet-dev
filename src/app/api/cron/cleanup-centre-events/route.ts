/**
 * GUIC-394 — Cron Vercel : purge CDP des `centre_events` > 6 mois.
 *
 * Conformité CDP (spec M4 §3.1 + §4.4) : la table `CentreEvent` est
 * INSERT-only, retention 180 jours. Ce job est planifié 1× / jour à 03:00
 * UTC via `vercel.json`.
 *
 * Auth : Bearer `CRON_SECRET` (header `Authorization`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import type { ApiResponse } from '@/types/api'

export const maxDuration = 300

const RETENTION_DAYS = 180
const RETENTION_MS = RETENTION_DAYS * 24 * 60 * 60 * 1000

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization')

  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non autorisé' } },
      { status: 401 },
    )
  }

  const cutoff = new Date(Date.now() - RETENTION_MS)

  try {
    const result = await prisma.centreEvent.deleteMany({
      where: { ts: { lt: cutoff } },
    })

    logger.info('cron/cleanup-centre-events ok', {
      deleted: result.count,
      cutoff:  cutoff.toISOString(),
    })

    return NextResponse.json({
      data: {
        deleted: result.count,
        cutoff:  cutoff.toISOString(),
      },
    })
  } catch (err) {
    logger.error('cron/cleanup-centre-events failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'CLEANUP_FAILED', message: 'Cleanup failed' } },
      { status: 500 },
    )
  }
}
