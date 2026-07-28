/**
 * GUIC-684 — Cron : contrôle d'intégrité des rattachements aux programmes.
 *
 * Les invariants (« exactement un principal », « au moins un programme sur un
 * contenu ») sont garantis côté applicatif ; rien en base ne les impose. La base
 * étant aussi écrite par des scripts SQL, des migrations et des backfills, une
 * dérive introduite par ces chemins resterait invisible jusqu'à ce qu'un badge
 * disparaisse ou qu'un export serve un programme arbitraire.
 *
 * Le job ne RÉPARE rien : il journalise. Une correction automatique masquerait la
 * cause, et le rattachement est une donnée métier — la retoucher sans humain
 * reviendrait à décider à sa place de quel programme relève un contenu.
 *
 * Auth : Bearer `CRON_SECRET`.
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkProgrammeIntegrity } from '@/lib/programmes/integrity'
import { logger } from '@/lib/logger'
import type { ApiResponse } from '@/types/api'

export const maxDuration = 300

/** Plafond de détail journalisé — au-delà, seuls les compteurs sont utiles. */
const MAX_DETAIL = 20

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
    const issues = await checkProgrammeIntegrity()

    const parRaison = issues.reduce<Record<string, number>>((acc, i) => {
      const cle = `${i.entite}:${i.raison}`
      acc[cle] = (acc[cle] ?? 0) + 1
      return acc
    }, {})

    if (issues.length > 0) {
      logger.warn('[cron:programme-integrity] anomalies de rattachement détectées', {
        total: issues.length,
        parRaison,
        // Échantillon borné : de quoi ouvrir une fiche, pas de quoi noyer les logs.
        echantillon: issues.slice(0, MAX_DETAIL),
      })
    } else {
      logger.info('[cron:programme-integrity] aucun problème de rattachement')
    }

    return NextResponse.json({ data: { total: issues.length, parRaison } })
  } catch (err) {
    logger.error('[cron:programme-integrity] échec du contrôle', { err: String(err) })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Contrôle d’intégrité en échec' } },
      { status: 500 },
    )
  }
}
