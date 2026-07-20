import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { executerVeille } from '@/lib/curation/robot/run'
import { clientHttpReel } from '@/lib/curation/robot/http-client'
import type { ApiResponse } from '@/types/api'

/**
 * GUIC-597 — US-2 : robot de découverte planifié (curation, épic GUIC-595).
 * Invoqué par cron Vercel (cf. `vercel.json`) — Bearer `CRON_SECRET`. Tâche de fond
 * hors requête utilisateur : sélectionne les sources dues, découvre les liens (listing
 * seul), déduplique et journalise. L'extraction des champs est US-3.
 */

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
    const rapport = await executerVeille({ client: clientHttpReel() })
    logger.info('cron/veille-sources ok', { ...rapport })
    return NextResponse.json({ data: rapport })
  } catch (err) {
    logger.error('cron/veille-sources failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'VEILLE_FAILED', message: 'Échec du robot de veille' } },
      { status: 500 },
    )
  }
}
