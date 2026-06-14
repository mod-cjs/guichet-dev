/**
 * GUIC-392 — Cron Vercel batch journalier : marque les réservations Acceptee
 * dont le créneau est terminé en `Passee` (si CheckIn associé) ou `NonHonoree`
 * (si aucun CheckIn) — cf. `.agent_context/specs/M4-centres-lot7.md` §5 Wave 5.
 *
 * Invoqué par Vercel cron (cf. `vercel.json`). Auth via `CRON_SECRET` :
 *   Authorization: Bearer <CRON_SECRET>
 *
 * Programmé 1× / jour à 04:00 UTC (heure Sénégal = UTC).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
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
    // Filtre : réservations Acceptee dont `dateReservee` (jour calendaire) est
    // strictement antérieure à aujourd'hui (00:00 UTC). On ne traite pas les
    // créneaux du jour même — on attend le lendemain pour décider.
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)

    const candidates = await prisma.reservation.findMany({
      where: { statut: 'Acceptee', dateReservee: { lt: today } },
      include: { checkIns: { take: 1 } },
    })

    let passees = 0
    let nonHonorees = 0
    for (const r of candidates) {
      const hasCheckIn = r.checkIns.length > 0
      const nextStatut = hasCheckIn ? 'Passee' : 'NonHonoree'
      await prisma.reservation.update({
        where: { id: r.id },
        data: { statut: nextStatut },
      })
      if (hasCheckIn) passees++
      else nonHonorees++
    }

    return NextResponse.json({
      data: { passees, nonHonorees, total: candidates.length },
    })
  } catch (err) {
    logger.error('cron/reservations-batch failed', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json(
      { error: { code: 'BATCH_FAILED', message: 'Batch failed' } },
      { status: 500 },
    )
  }
}
