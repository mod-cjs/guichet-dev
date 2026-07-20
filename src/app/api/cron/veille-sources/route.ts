import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { logger } from '@/lib/logger'
import { executerVeille } from '@/lib/curation/robot/run'
import { executerExtraction } from '@/lib/curation/extraction/run'
import { clientHttpReel } from '@/lib/curation/robot/http-client'
import type { ApiResponse } from '@/types/api'

/** Comparaison en temps constant du bearer (évite l'oracle temporel sur le secret). */
function secretValide(provided: string | null, secret: string): boolean {
  const attendu = Buffer.from(`Bearer ${secret}`)
  const recu = Buffer.from(provided ?? '')
  return recu.length === attendu.length && timingSafeEqual(recu, attendu)
}

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
  if (!secret || !secretValide(provided, secret)) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non autorisé' } },
      { status: 401 },
    )
  }

  try {
    const client = clientHttpReel()
    // Phase 1 : découverte des liens candidats (US-2).
    const decouverte = await executerVeille({ client })
    // Phase 2 : extraction déterministe d'un lot borné d'items découverts (US-3).
    const extraction = await executerExtraction({ client })
    logger.info('cron/veille-sources ok', { ...decouverte, ...extraction })
    return NextResponse.json({ data: { decouverte, extraction } })
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
