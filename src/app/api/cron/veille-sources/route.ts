import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'node:crypto'
import { logger } from '@/lib/logger'
import { executerVeille } from '@/lib/curation/robot/run'
import { executerExtraction } from '@/lib/curation/extraction/run'
import { clientHttpReel } from '@/lib/curation/robot/http-client'
import { avecVerrouVeille } from '@/lib/curation/robot/verrou'
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
    // Un SEUL verrou couvre découverte ET extraction : deux ticks qui se chevauchent
    // ne double-fetchent jamais les mêmes sources/items.
    const resultat = await avecVerrouVeille(async () => {
      const client = clientHttpReel()
      const decouverte = await executerVeille({ client, sansVerrou: true })
      const extraction = await executerExtraction({ client })
      return { decouverte, extraction }
    })
    if ('ignore' in resultat) {
      logger.info('cron/veille-sources ignore (run concurrent)')
      return NextResponse.json({ data: { ignore: true } })
    }
    logger.info('cron/veille-sources ok', {
      ...resultat.decouverte,
      ...resultat.extraction,
    })
    return NextResponse.json({ data: resultat })
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
