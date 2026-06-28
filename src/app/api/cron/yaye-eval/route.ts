/**
 * GUIC-435 — Cron : évaluation conversationnelle nocturne de Yaye (juge LLM).
 * Échantillonne les sessions des dernières 24h (stratifié : escalades/erreurs +
 * échantillon aléatoire), les fait noter par le juge Groq, écrit yaye_eval_scores.
 *
 * À planifier APRÈS `yaye-graph-sync` (02:30) → vercel.json : `0 3 * * *`.
 * Auth : Bearer `CRON_SECRET` (header `Authorization`), comme yaye-graph-sync.
 */

import { NextRequest, NextResponse } from 'next/server'
import { logger } from '@/lib/logger'
import { runEval } from '@/lib/ia/metrics/eval-run'
import { materializeSummaries } from '@/lib/ia/metrics/materialize'
import { runRegressionGuard } from '@/lib/ia/metrics/regression-data'
import { computeCalibration } from '@/lib/ia/metrics/calibration-data'
import type { ApiResponse } from '@/types/api'

// Le jugement LLM séquentiel peut être long ; on borne la durée d'exécution.
export const maxDuration = 300

const FENETRE_MS = 24 * 3600 * 1000
/** Fenêtre glissante pour la garde anti-régression et la calibration. */
const FENETRE_GARDE_MS = 7 * FENETRE_MS

export async function GET(request: NextRequest): Promise<NextResponse<ApiResponse>> {
  const secret = process.env.CRON_SECRET
  const provided = request.headers.get('authorization')
  if (!secret || provided !== `Bearer ${secret}`) {
    return NextResponse.json({ error: { code: 'UNAUTHORIZED', message: 'Non autorisé' } }, { status: 401 })
  }

  try {
    const to = new Date()
    const from = new Date(to.getTime() - FENETRE_MS)
    const sampleSize = Number(process.env.YAYE_EVAL_SAMPLE_SIZE ?? 50)

    const report = await runEval({ from, to, sampleSize })
    // Matérialise les résumés de session (métriques + YQS) dans yaye_session_summaries.
    const materialisation = await materializeSummaries({ from, to })

    // Garde anti-régression + calibration juge↔humain (fenêtre 7 j). Fail-soft :
    // une erreur de mesure ne doit jamais faire échouer l'évaluation nocturne.
    let regression = null
    let calibration = null
    try {
      const garde = { from: new Date(to.getTime() - FENETRE_GARDE_MS), to }
      regression = await runRegressionGuard(garde)
      calibration = await computeCalibration(garde)
    } catch (err) {
      logger.warn('cron/yaye-eval mesures qualité (régression/calibration) échec', { err: String(err) })
    }

    logger.info('cron/yaye-eval ok', {
      ...report,
      materialisation,
      regression: regression?.baselineInitialisee ? 'baseline-initialisée' : regression?.result?.regressed,
      calibrationGlobal: calibration?.global ?? null,
    })

    return NextResponse.json({ data: { ...report, materialisation, regression, calibration } })
  } catch (err) {
    logger.error('cron/yaye-eval échec', { err: String(err) })
    return NextResponse.json(
      { error: { code: 'EVAL_ERROR', message: "L'évaluation Yaye a échoué." } },
      { status: 500 },
    )
  }
}
