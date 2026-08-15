/**
 * Cron — PRÉCALCUL des recommandations de Yaye (spec 02 §0 : « même calcul exécuté en
 * avance »). Recompute par traversée du graphe et persiste dans `RecommandationIA` (cache),
 * pour que `get_recommendations` + la contextualisation servent le cache (latence + push).
 *
 * À planifier après la reprojection du graphe (le graphe doit être frais). Auth : Bearer
 * `CRON_SECRET`. Paramètre optionnel `?limit=N` (borne le nombre de bénéficiaires par run).
 */

import { NextRequest, NextResponse } from 'next/server'
import { cronCourtCircuite } from '@/lib/flags/guard'
import { logger } from '@/lib/logger'
import { precomputeRecommandations } from '@/lib/ia/recommandation'
import type { ApiResponse } from '@/types/api'

export const maxDuration = 300

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  // GUIC-706 — court-circuit plutôt que 404 : un 404 sur une tâche planifiée serait
  // compté comme un échec d'exécution et déclencherait une alerte pour une fermeture
  // pourtant volontaire.
  if (await cronCourtCircuite('/api/cron/yaye-reco-precompute')) {
    return NextResponse.json({ data: { skipped: 'fonctionnalite_masquee' } })
  }

  const secret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization')
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non autorisé' } }, { status: 401 })
  }

  const limitRaw = new URL(request.url).searchParams.get('limit')
  const limit = limitRaw ? Math.max(1, parseInt(limitRaw, 10) || 0) || undefined : undefined

  try {
    const report = await precomputeRecommandations({ limit })
    logger.info('cron/yaye-reco-precompute ok', report)
    return NextResponse.json({ data: report })
  } catch (err) {
    logger.error('cron/yaye-reco-precompute failed', { err: String(err) })
    return NextResponse.json({ error: { code: 'PRECOMPUTE_FAILED', message: 'Échec du précalcul' } }, { status: 500 })
  }
}
