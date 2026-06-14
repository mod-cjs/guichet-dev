/**
 * GUIC-387 / GUIC-389 — POST /api/v1/checkin/[token]
 *
 * Scanner staff : confirme la présence physique d'un jeune en validant le
 * JWT QR de sa MyCJSCard.
 *
 * Flow :
 *  1. Auth staff via cookie (`getStaffSession`) — 401 si absent
 *  2. Vérif JWT (signature + exp + kid + scope) via {@link verifyCJSCardToken}
 *  3. Anti-replay Redis : `SET NX checkin:<nonce>` TTL 24h
 *     (GUIC-389 : on NE supprime PLUS le nonce en cas d'échec aval —
 *     ALREADY_USED reste acceptable car traduit une tentative anormale,
 *     ferme la fenêtre de race entre deux requêtes parallèles).
 *  4. centreId du body DOIT == staff.centreId (sinon 403 CENTRE_FORBIDDEN)
 *  5. Si `reservationId` → update statut → `Passee`, sinon présence standalone
 *  6. Crée la row `CheckIn(via='QrCard')` + event KPI `centre_checkin`
 *
 * Sécurité GUIC-389 :
 *  - `conseillerEmail` est IGNORÉ du body ; seul `staff.email` (cookie) est
 *    utilisé côté serveur — empêche l'usurpation par injection de body.
 *  - centre restreint au centre du staff connecté.
 *
 * Codes : 200 / 400 INVALID_INPUT / 401 STAFF_UNAUTHORIZED|TOKEN_INVALID
 *         / 403 CENTRE_FORBIDDEN / 404 CENTRE/RESA
 *         / 409 ALREADY_USED / 410 EXPIRED.
 *
 * Spec : ADR-002 + spec M4 §5 Wave 6.
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import {
  CJSCardTokenError,
  verifyCJSCardToken,
} from '@/lib/auth/verifyCJSCardToken'
import { getStaffSession } from '@/lib/auth/staff-session'
import { trackCentreEvent } from '@/lib/analytics/centre-events'
import type { ApiResponse } from '@/types/api'

const NONCE_TTL_SECONDS = 24 * 3600

const BodySchema = z.object({
  centreId:         z.string().min(1).max(36),
  reservationId:    z.string().min(1).max(36).optional(),
  // GUIC-389 : `conseillerEmail` du body est IGNORÉ. Toléré pour
  // rétrocompat client mais ne sert plus de source d'autorité.
  conseillerEmail:  z.string().email().max(255).optional(),
})

interface CheckInResponse {
  checkInId:         string
  jeuneName:         string
  reservationStatut?: 'Passee'
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> },
) {
  // 1. Auth staff obligatoire (cookie httpOnly).
  const staff = await getStaffSession()
  if (!staff) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'STAFF_UNAUTHORIZED', message: 'Session staff requise' } },
      { status: 401 },
    )
  }

  const rl = await rateLimit(request, {
    windowMs:  60_000,
    max:       30,
    keyPrefix: `checkin-staff:${staff.email}`,
    authenticated: true,
  })
  if (rl) return rl

  const { token } = await context.params
  if (!token) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'INVALID_INPUT', message: 'Token manquant' } },
      { status: 400 },
    )
  }

  let payload
  try {
    payload = await verifyCJSCardToken(token)
  } catch (err) {
    if (err instanceof CJSCardTokenError && err.reason === 'expired') {
      return NextResponse.json<ApiResponse>(
        { error: { code: 'TOKEN_EXPIRED', message: 'QR expiré, demander un rafraîchissement' } },
        { status: 410 },
      )
    }
    return NextResponse.json<ApiResponse>(
      { error: { code: 'TOKEN_INVALID', message: 'QR invalide' } },
      { status: 401 },
    )
  }

  if (!payload) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'TOKEN_INVALID', message: 'QR invalide' } },
      { status: 401 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'INVALID_JSON', message: 'JSON invalide' } },
      { status: 400 },
    )
  }

  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'INVALID_INPUT', message: 'Données invalides' } },
      { status: 400 },
    )
  }

  const { centreId, reservationId } = parsed.data
  // GUIC-389 : la SEULE source d'autorité pour le conseiller est le cookie.
  const conseillerEmail = staff.email.trim().toLowerCase()

  // GUIC-389 : le staff ne peut check-in QUE sur son propre centre.
  if (centreId !== staff.centreId) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'CENTRE_FORBIDDEN', message: 'Vous ne pouvez confirmer une présence que dans votre centre' } },
      { status: 403 },
    )
  }

  // Anti-replay Redis (SET NX). Si la clé existe déjà → token déjà consommé.
  // GUIC-389 : pas de `redis.del` post-validation. Fermé la fenêtre de race
  // où deux requêtes parallèles avec même token pouvaient passer.
  const nonceKey = `checkin:${payload.nonce}`
  try {
    const setRes = await redis.set(nonceKey, '1', 'EX', NONCE_TTL_SECONDS, 'NX')
    if (setRes !== 'OK') {
      return NextResponse.json<ApiResponse>(
        { error: { code: 'ALREADY_USED', message: 'QR déjà utilisé' } },
        { status: 409 },
      )
    }
  } catch (err) {
    // Fail-soft : on log mais on n'autorise PAS le check-in si Redis est down
    // (anti-replay obligatoire).
    logger.error('[checkin] redis SET NX échoué', { err })
    return NextResponse.json<ApiResponse>(
      { error: { code: 'INTERNAL', message: 'Service indisponible, réessayer' } },
      { status: 503 },
    )
  }

  // Vérif centre + utilisateur
  const [centre, utilisateur] = await Promise.all([
    prisma.centre.findUnique({ where: { id: centreId }, select: { id: true } }),
    prisma.utilisateur.findUnique({
      where:  { cjsUid: payload.sub },
      select: { cjsUid: true, nom: true, prenom: true },
    }),
  ])

  if (!centre) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'CENTRE_NOT_FOUND', message: 'Centre introuvable' } },
      { status: 404 },
    )
  }
  if (!utilisateur) {
    return NextResponse.json<ApiResponse>(
      { error: { code: 'USER_NOT_FOUND', message: 'Jeune introuvable' } },
      { status: 404 },
    )
  }

  // Si réservation fournie : vérif appartenance + update statut
  let reservationStatut: 'Passee' | undefined
  if (reservationId) {
    const resa = await prisma.reservation.findUnique({
      where:  { id: reservationId },
      select: { id: true, cjsUid: true, centreId: true, statut: true },
    })
    if (!resa || resa.cjsUid !== utilisateur.cjsUid || resa.centreId !== centreId) {
      return NextResponse.json<ApiResponse>(
        { error: { code: 'RESERVATION_NOT_FOUND', message: 'Réservation introuvable pour ce jeune/centre' } },
        { status: 404 },
      )
    }
    await prisma.reservation.update({
      where: { id: reservationId },
      data:  { statut: 'Passee' },
    })
    reservationStatut = 'Passee'
  }

  const checkIn = await prisma.checkIn.create({
    data: {
      cjsUid:          utilisateur.cjsUid,
      centreId,
      reservationId:   reservationId ?? null,
      via:             'QrCard',
      conseillerEmail,
      jwtNonce:        payload.nonce,
      meta:            { source: 'staff-scanner-v1' },
    },
    select: { id: true },
  })

  await trackCentreEvent({
    type:     'centre_checkin_completed',
    centreId,
    cjsUid:   utilisateur.cjsUid,
    metadata: {
      reservationId: reservationId ?? null,
      via:           'QrCard',
    },
  }).catch((err) => logger.warn('[checkin] tracking échoué', { err }))

  return NextResponse.json<ApiResponse<CheckInResponse>>({
    data: {
      checkInId: checkIn.id,
      jeuneName: `${utilisateur.prenom} ${utilisateur.nom}`,
      reservationStatut,
    },
  })
}
