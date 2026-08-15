/**
 * GUIC-683 — Cron d'AMORÇAGE du cache de vecteurs de Yaye.
 *
 * Pourquoi une route dédiée, en plus du préchauffage déjà greffé sur la reprojection
 * nocturne : cette dernière ne passe qu'une fois par nuit. Avec un budget de 180 s et un
 * coût unitaire de 280 ms, elle vectorise ~640 textes par passage — il faudrait sept nuits
 * pour couvrir un catalogue de 4 200 offres. Sept nuits pendant lesquelles la recherche
 * sémantique reste muette sur l'essentiel du catalogue.
 *
 * En passant à l'heure, l'amorçage se termine dans la JOURNÉE qui suit le déploiement.
 * Et une fois le catalogue couvert, le cron devient un no-op de quelques centaines de
 * millisecondes : il ne s'arrête pas pour autant, car il vectorise ensuite les offres
 * publiées dans la journée, sans attendre la nuit suivante.
 *
 * ⚠️ PRÉREQUIS OVH (piège B8 de la checklist go-live) : sur OVH, Vercel Cron n'existe plus.
 * Déclarer la tâche dans `scripts/cron/jobs.json` ne suffit pas — il faut RÉGÉNÉRER ET
 * INSTALLER le crontab serveur (`scripts/cron/generate-crontab.sh`). Sans cette étape,
 * AUCUN cron du Guichet ne s'exécute, celui-ci comme les autres.
 *
 * ⚠️ FAIL-SOFT en aval : `warmSkillVectors` et `warmOpportuniteVectors` n'échouent jamais
 * pour une raison métier (endpoint muet, quota, base indisponible) — elles rendent un
 * rapport vide. Un 500 ici signale donc une anomalie réelle, pas un simple contretemps.
 *
 * Auth : Bearer `CRON_SECRET` (header `Authorization`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { cronCourtCircuite } from '@/lib/flags/guard'
import { logger } from '@/lib/logger'
import { warmOpportuniteVectors, warmSkillVectors } from '@/lib/ia/search-warmup'
import type { ApiResponse } from '@/types/api'

/**
 * Borne de durée. En PRODUCTION (OVH), les tâches sont lancées par un crontab système via
 * `scripts/cron/run-job.sh`, qui n'impose aucune limite : la vraie protection est le budget
 * de temps du préchauffage lui-même (180 s par défaut), calibré pour qu'un passage se termine
 * bien avant le suivant. Cette valeur ne sert qu'aux déploiements de type Vercel.
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

  // GUIC-706 — APRÈS le contrôle du secret : répondre « masqué » à un appelant non
  // authentifié lui apprendrait qu'une fonctionnalité est fermée, et contournerait
  // l'autorisation. Court-circuit et non 404 : un 404 serait compté comme un échec
  // d'exécution et alerterait pour une fermeture voulue.
  if (await cronCourtCircuite('/api/cron/yaye-warm-search')) {
    return NextResponse.json({ data: { skipped: 'fonctionnalite_masquee' } })
  }

  try {
    // Le référentiel de compétences d'abord : il sert le chemin de RÉPONSE (analyse
    // d'écart de compétences), qui lit le cache en lecture stricte. Le catalogue, lui,
    // ne dégrade que la recherche, et le lexical y répond en attendant.
    const competences = await warmSkillVectors()
    const catalogue = await warmOpportuniteVectors()

    const couverture = catalogue.uniques > 0
      ? Math.round((catalogue.vecteurs / catalogue.uniques) * 100)
      : 100

    logger.info('cron/yaye-warm-search ok', {
      competences,
      vecteurs: catalogue.vecteurs,
      uniques: catalogue.uniques,
      couverture,
      complet: catalogue.complet,
      dureeMs: catalogue.dureeMs,
    })

    return NextResponse.json({ data: { ...catalogue, competences, couverture } })
  } catch (err) {
    logger.error('cron/yaye-warm-search failed', { error: String(err) })
    return NextResponse.json(
      { error: { code: 'WARMUP_FAILED', message: 'Amorçage du cache de vecteurs échoué' } },
      { status: 500 },
    )
  }
}
