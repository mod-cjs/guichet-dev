/**
 * GUIC-231 — Cron Vercel : cleanup des CV orphelins sur Blob.
 *
 * Invoqué par Vercel cron (cf. `vercel.json`). Auth via `CRON_SECRET` :
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Programmé 1× / jour à 03:00 UTC (heure Sénégal = UTC).
 */

import { NextRequest, NextResponse } from 'next/server'
import { cleanupCvOrphans } from '@/lib/cleanup-cv-orphans'
import { logger } from '@/lib/logger'
import type { ApiResponse } from '@/types/api'

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
    const result = await cleanupCvOrphans({ apply: true })
    return NextResponse.json({
      data: {
        scanned: result.scanned,
        orphans: result.orphans,
        deleted: result.deleted,
        errors: result.errors,
        durationMs: result.durationMs,
      },
    })
  } catch (err) {
    logger.error('cron/cleanup-cv failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'CLEANUP_FAILED', message: 'Cleanup failed' } },
      { status: 500 },
    )
  }
}
