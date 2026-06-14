import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { trackCentreEvent } from '@/lib/analytics/centre-events'
import type { ApiResponse } from '@/types/api'

/**
 * PATCH /api/reservations/[id] — workflow annulation par le jeune (W5).
 *
 * Body : `{ action: 'cancel' }`
 *
 * Codes HTTP :
 *   - 200 : annulée
 *   - 400 : action inconnue
 *   - 401 : non authentifié
 *   - 403 : pas le propriétaire
 *   - 404 : introuvable
 *   - 409 : statut non annulable (CANNOT_CANCEL)
 *   - 410 : créneau déjà passé (ALREADY_PASSED)
 *   - 429 : rate-limit
 *
 * Auth : `getSession` · rate-limit 10/min par cjsUid.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 5.
 */

const PatchSchema = z.object({
  action: z.enum(['cancel']),
})

interface PatchResult {
  reservation: {
    id: string
    statut: string
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse<ApiResponse<PatchResult>>> {
  const { id } = await context.params

  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 10,
    keyPrefix: `reservations-patch:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse<PatchResult>>

  const raw = await request.json().catch(() => null)
  const parsed = PatchSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Action invalide',
        },
      },
      { status: 400 },
    )
  }

  try {
    const reservation = await prisma.reservation.findUnique({
      where: { id },
      include: {
        ressource: { select: { type: true } },
        centre: { select: { slug: true } },
      },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Réservation introuvable.' } },
        { status: 404 },
      )
    }

    if (reservation.cjsUid !== session.cjsUid) {
      return NextResponse.json(
        { error: { code: 'FORBIDDEN', message: 'Action non autorisée.' } },
        { status: 403 },
      )
    }

    if (reservation.statut !== 'Acceptee' && reservation.statut !== 'EnAttente') {
      return NextResponse.json(
        {
          error: {
            code: 'CANNOT_CANCEL',
            message: 'Cette réservation ne peut plus être annulée.',
          },
        },
        { status: 409 },
      )
    }

    // Créneau déjà passé : combiner date + creneauFin
    const [fh, fm] = reservation.creneauFin.split(':').map(Number)
    const endDt = new Date(reservation.dateReservee)
    endDt.setHours(fh ?? 0, fm ?? 0, 0, 0)
    if (endDt.getTime() <= Date.now()) {
      return NextResponse.json(
        {
          error: {
            code: 'ALREADY_PASSED',
            message: 'Le créneau est déjà passé.',
          },
        },
        { status: 410 },
      )
    }

    const now = new Date()
    const updated = await prisma.reservation.update({
      where: { id },
      data: {
        statut: 'AnnuleeParJeune',
        decisionA: now,
        annuleeA: now,
      },
    })

    void trackCentreEvent({
      type: 'centre_reservation_cancelled',
      centreId: reservation.centreId,
      cjsUid: session.cjsUid,
      metadata: {
        reservationId: id,
        ressourceType: String(reservation.ressource?.type ?? ''),
        centreSlug: reservation.centre?.slug ?? '',
      },
    })

    return NextResponse.json(
      {
        data: {
          reservation: {
            id: updated.id,
            statut: String(updated.statut),
          },
        },
      },
      { status: 200 },
    )
  } catch (err) {
    logger.error('[PATCH /api/reservations/:id] échec inattendu', {
      error: err instanceof Error ? err.message : String(err),
      cjsUid: session.cjsUid,
      reservationId: id,
    })
    return NextResponse.json(
      {
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Erreur interne — réessaye.',
        },
      },
      { status: 500 },
    )
  }
}
