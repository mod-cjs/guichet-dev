import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { trackCentreEvent } from '@/lib/analytics/centre-events'
import { notifyReservation } from '@/lib/notifications/reservations'
import type { ApiResponse } from '@/types/api'

/**
 * POST /api/reservations — création d'une réservation ressource centre (W4).
 *
 * Auth requise · rate-limit 5/min par cjsUid · transaction Serializable pour
 * éviter les double-réservations sur le même créneau.
 *
 * Statut MVP : auto-validée (`Acceptee`) — workflow approval Sprint+1.
 *
 * Spec : .agent_context/specs/M4-centres-lot7.md §3.2 + §5 Wave 4.
 */

const CreateReservationSchema = z.object({
  ressourceId: z.string().uuid(),
  dateReservee: z.string().datetime(),
  creneauDebut: z.string().regex(/^\d{2}:\d{2}$/),
  creneauFin: z.string().regex(/^\d{2}:\d{2}$/),
  nombrePersonnes: z.number().int().min(1).max(50),
  motif: z.string().min(20).max(2000),
  justifFileUrl: z.string().url().optional().or(z.literal('')).transform((v) =>
    v === '' ? undefined : v,
  ),
})

type CreateReservationBody = z.infer<typeof CreateReservationSchema>

interface ReservationResult {
  reservation: {
    id: string
    statut: string
    dateReservee: string
    creneauDebut: string
    creneauFin: string
    ressourceId: string
    centreId: string
  }
}

type ReservationError =
  | 'RESOURCE_NOT_FOUND'
  | 'CAPACITE_DEPASSEE'
  | 'JUSTIF_REQUIS'
  | 'CRENEAU_OCCUPE'
  | 'DATE_INVALIDE'

class ReservationDomainError extends Error {
  constructor(public readonly code: ReservationError, message: string) {
    super(message)
    this.name = 'ReservationDomainError'
  }
}

const ERROR_STATUS: Record<ReservationError, number> = {
  RESOURCE_NOT_FOUND: 404,
  CAPACITE_DEPASSEE: 400,
  JUSTIF_REQUIS: 400,
  CRENEAU_OCCUPE: 409,
  DATE_INVALIDE: 400,
}

const ERROR_MESSAGES: Record<ReservationError, string> = {
  RESOURCE_NOT_FOUND: 'Ressource introuvable ou désactivée.',
  CAPACITE_DEPASSEE: 'Nombre de personnes supérieur à la capacité.',
  JUSTIF_REQUIS: 'Une pièce justificative est requise pour cette ressource.',
  CRENEAU_OCCUPE: 'Ce créneau est déjà réservé.',
  DATE_INVALIDE: 'Date de réservation invalide.',
}

export async function POST(
  request: NextRequest,
): Promise<NextResponse<ApiResponse<ReservationResult>>> {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Non authentifié' } },
      { status: 401 },
    )
  }

  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 5,
    keyPrefix: `reservations-post:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited as NextResponse<ApiResponse<ReservationResult>>

  const raw = await request.json().catch(() => null)
  const parsed = CreateReservationSchema.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: parsed.error.issues[0]?.message ?? 'Données invalides',
        },
      },
      { status: 400 },
    )
  }
  const body: CreateReservationBody = parsed.data

  // Sanity: créneau fin > début
  if (body.creneauFin <= body.creneauDebut) {
    return NextResponse.json(
      {
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Le créneau de fin doit être après le créneau de début.',
        },
      },
      { status: 400 },
    )
  }

  // Date strictement future (au moins aujourd'hui)
  const dateRes = new Date(body.dateReservee)
  if (Number.isNaN(dateRes.getTime())) {
    return NextResponse.json(
      { error: { code: 'DATE_INVALIDE', message: ERROR_MESSAGES.DATE_INVALIDE } },
      { status: 400 },
    )
  }
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  if (dateRes < todayStart) {
    return NextResponse.json(
      { error: { code: 'DATE_INVALIDE', message: 'La date doit être dans le futur.' } },
      { status: 400 },
    )
  }

  try {
    const reservation = await prisma.$transaction(
      async (tx) => {
        // 1. Charger ressource + centre
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ressource = (await (tx as any).ressourceCentre.findUnique({
          where: { id: body.ressourceId },
        })) as Record<string, unknown> | null

        if (!ressource || !ressource.estActive) {
          throw new ReservationDomainError(
            'RESOURCE_NOT_FOUND',
            ERROR_MESSAGES.RESOURCE_NOT_FOUND,
          )
        }
        if (body.nombrePersonnes > Number(ressource.capacite ?? 1)) {
          throw new ReservationDomainError(
            'CAPACITE_DEPASSEE',
            ERROR_MESSAGES.CAPACITE_DEPASSEE,
          )
        }
        if (
          Boolean(ressource.requiresJustif) &&
          !body.justifFileUrl
        ) {
          throw new ReservationDomainError(
            'JUSTIF_REQUIS',
            ERROR_MESSAGES.JUSTIF_REQUIS,
          )
        }

        // 2. Conflit créneau (Acceptee ou EnAttente)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const conflict = await (tx as any).reservation.findFirst({
          where: {
            ressourceId: body.ressourceId,
            dateReservee: dateRes,
            creneauDebut: body.creneauDebut,
            statut: { in: ['Acceptee', 'EnAttente'] },
          },
        })
        if (conflict) {
          throw new ReservationDomainError(
            'CRENEAU_OCCUPE',
            ERROR_MESSAGES.CRENEAU_OCCUPE,
          )
        }

        // 3. Création — auto-validée MVP (option c, cf. spec §2)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const created = (await (tx as any).reservation.create({
          data: {
            cjsUid: session.cjsUid,
            centreId: String(ressource.centreId),
            ressourceId: body.ressourceId,
            dateReservee: dateRes,
            creneauDebut: body.creneauDebut,
            creneauFin: body.creneauFin,
            nombrePersonnes: body.nombrePersonnes,
            motif: body.motif,
            justifFileUrl: body.justifFileUrl ?? null,
            statut: 'Acceptee',
            decisionA: new Date(),
          },
        })) as Record<string, unknown>

        return {
          id: String(created.id),
          statut: String(created.statut),
          centreId: String(created.centreId),
          ressourceId: String(created.ressourceId),
          ressourceNom: String(ressource.nom),
          dateReservee: (created.dateReservee as Date).toISOString(),
          creneauDebut: String(created.creneauDebut),
          creneauFin: String(created.creneauFin),
        }
      },
      { isolationLevel: 'Serializable' },
    )

    // Tracking + notifs (post-transaction, fail-soft)
    void trackCentreEvent({
      type: 'centre_reservation_submitted',
      centreId: reservation.centreId,
      cjsUid: session.cjsUid,
      metadata: { ressourceId: reservation.ressourceId },
    })
    void trackCentreEvent({
      type: 'centre_reservation_accepted',
      centreId: reservation.centreId,
      cjsUid: session.cjsUid,
      metadata: { reservationId: reservation.id, autoValidated: true },
    })
    void notifyReservation(
      {
        reservationId: reservation.id,
        cjsUid: session.cjsUid,
        centreId: reservation.centreId,
        ressourceNom: reservation.ressourceNom,
        dateReservee: new Date(reservation.dateReservee),
        creneauDebut: reservation.creneauDebut,
        creneauFin: reservation.creneauFin,
      },
      'created',
    )

    return NextResponse.json(
      {
        data: {
          reservation: {
            id: reservation.id,
            statut: reservation.statut,
            dateReservee: reservation.dateReservee,
            creneauDebut: reservation.creneauDebut,
            creneauFin: reservation.creneauFin,
            ressourceId: reservation.ressourceId,
            centreId: reservation.centreId,
          },
        },
      },
      { status: 201 },
    )
  } catch (err) {
    if (err instanceof ReservationDomainError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: ERROR_STATUS[err.code] },
      )
    }
    logger.error('[POST /api/reservations] échec inattendu', {
      error: err instanceof Error ? err.message : String(err),
      cjsUid: session.cjsUid,
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
