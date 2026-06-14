/**
 * GUIC-395 — POST /api/centre-staff/[centreId]/reservations/[id]/cancel
 *
 * Annulation d'une réservation côté staff centre (Lot 7 W6 MVP).
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §3.2 ("staff peut annuler post").
 *
 * Flow :
 *  1. Auth via cookie staff (`getStaffSession`) — 401 STAFF_UNAUTHORIZED sinon
 *  2. `staff.centreId === [centreId]` (URL) — 403 CENTRE_FORBIDDEN sinon
 *  3. Réservation trouvée (404 NOT_FOUND sinon) ET `reservation.centreId === [centreId]`
 *     (403 RESERVATION_FORBIDDEN sinon)
 *  4. Statut in (`Acceptee`, `EnAttente`) — 409 CANNOT_CANCEL sinon
 *  5. Update : `statut = AnnuleeParCentre`, `raisonRefusOuAnnul` (body optionnel, ≤500c),
 *     `annuleeA = now`, `decisionA = now`
 *  6. Tracking `centre_reservation_cancelled_by_staff` (fail-soft)
 *
 * Réponse 200 : `{ data: { id, statut } }`
 *
 * Statut posté : `AnnuleeParCentre` (migration `20260614180000_add_statut_annulee_par_centre`).
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getStaffSession } from '@/lib/auth/staff-session'
import { trackCentreEvent } from '@/lib/analytics/centre-events'
import type { ApiResponse } from '@/types/api'

const BodySchema = z.object({
  raison: z.string().trim().max(500).optional(),
})

interface CancelResult {
  id:     string
  statut: string
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ centreId: string; id: string }> },
): Promise<NextResponse<ApiResponse<CancelResult>>> {
  const { centreId, id } = await context.params

  // 1. Auth staff
  const staff = await getStaffSession()
  if (!staff) {
    return NextResponse.json(
      { error: { code: 'STAFF_UNAUTHORIZED', message: 'Session staff requise.' } },
      { status: 401 },
    )
  }

  // 2. centreId URL doit matcher staff.centreId
  if (staff.centreId !== centreId) {
    return NextResponse.json(
      { error: { code: 'CENTRE_FORBIDDEN', message: 'Centre hors périmètre.' } },
      { status: 403 },
    )
  }

  const rl = await rateLimit(request, {
    windowMs:      60_000,
    max:           20,
    keyPrefix:     `centre-staff-cancel:${staff.email}`,
    authenticated: true,
  })
  if (rl) return rl as NextResponse<ApiResponse<CancelResult>>

  // Body optionnel — JSON tolérant (body vide accepté)
  const raw = await request.json().catch(() => ({}))
  const parsed = BodySchema.safeParse(raw ?? {})
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code:    'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Body invalide.',
        },
      },
      { status: 400 },
    )
  }
  const raisonBody = parsed.data.raison?.trim() ?? ''

  try {
    const reservation = await prisma.reservation.findUnique({
      where:  { id },
      select: {
        id:       true,
        centreId: true,
        statut:   true,
        ressource: { select: { type: true } },
        centre:    { select: { slug: true } },
      },
    })

    if (!reservation) {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: 'Réservation introuvable.' } },
        { status: 404 },
      )
    }

    // 3. La réservation doit appartenir au centre du staff
    if (reservation.centreId !== centreId) {
      return NextResponse.json(
        { error: { code: 'RESERVATION_FORBIDDEN', message: 'Réservation hors centre.' } },
        { status: 403 },
      )
    }

    // 4. Statut annulable
    if (reservation.statut !== 'Acceptee' && reservation.statut !== 'EnAttente') {
      return NextResponse.json(
        {
          error: {
            code:    'CANNOT_CANCEL',
            message: 'Cette réservation ne peut plus être annulée.',
          },
        },
        { status: 409 },
      )
    }

    const now = new Date()
    // GUIC-395 : raison optionnelle (le statut `AnnuleeParCentre` suffit à discriminer).
    const raisonFinale = raisonBody.length > 0 ? raisonBody : null

    const updated = await prisma.reservation.update({
      where: { id },
      data:  {
        statut:             'AnnuleeParCentre',
        raisonRefusOuAnnul: raisonFinale,
        decisionA:          now,
        annuleeA:           now,
      },
    })

    void trackCentreEvent({
      type:     'centre_reservation_cancelled_by_staff',
      centreId: reservation.centreId,
      metadata: {
        reservationId: id,
        ressourceType: String(reservation.ressource?.type ?? ''),
        centreSlug:    reservation.centre?.slug ?? '',
        staffEmail:    staff.email,
        hasRaison:     raisonBody.length > 0,
      },
    })

    return NextResponse.json(
      {
        data: {
          id:     updated.id,
          statut: String(updated.statut),
        },
      },
      { status: 200 },
    )
  } catch (err) {
    logger.error('[POST /api/centre-staff/:centreId/reservations/:id/cancel] échec', {
      error:         err instanceof Error ? err.message : String(err),
      staffEmail:    staff.email,
      centreId,
      reservationId: id,
    })
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'Erreur interne — réessaye.' } },
      { status: 500 },
    )
  }
}
