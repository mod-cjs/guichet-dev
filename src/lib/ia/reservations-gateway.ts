// Passerelle Yaye → API de réservation EXISTANTE (GUIC-273, Lot 2).
//
// ⚠️ INVARIANT : on N'IMPLÉMENTE PAS la réservation ici et on ne modifie PAS le
// service existant. On RÉUTILISE l'endpoint `POST /api/reservations` TEL QU'IL EST
// (mêmes validations Zod, transaction Serializable anti-double-booking, tracking
// KPI, notifications). Yaye se contente d'appeler ce handler EN PROCESS en
// propageant la session de l'appelant (cookie), sans aller-retour réseau.
//
// Auth : la session du jeune est portée par le cookie de la requête courante
// (next/headers, request-scoped). Hors contexte web (WhatsApp), on frappe une session
// ÉPHÉMÈRE pour l'identité déjà vérifiée par l'agent (GUIC-678, cf. actor-session.ts) ;
// sans identité exploitable, l'endpoint répond 401 et l'outil bascule sur le lien web.

import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'
import { POST as createReservationRoute } from '@/app/api/reservations/route'
import { logger } from '@/lib/logger'
import { buildActorCookieHeader } from './actor-session'

/** Charge utile alignée sur le schéma Zod de l'endpoint existant. */
export interface ReservationGatewayPayload {
  ressourceId: string
  /** ISO 8601 datetime (l'endpoint attend `z.string().datetime()`). */
  dateReservee: string
  /** "HH:MM". */
  creneauDebut: string
  /** "HH:MM". */
  creneauFin: string
  nombrePersonnes: number
  /** ≥ 20 caractères (contrainte de l'endpoint). */
  motif: string
  justifFileUrl?: string
}

export interface ReservationGatewaySuccess {
  ok: true
  reservation: {
    id: string
    statut: string
    centreId: string
    ressourceId: string
    dateReservee: string
    creneauDebut: string
    creneauFin: string
  }
}

export interface ReservationGatewayFailure {
  ok: false
  code: string
  message: string
  status: number
  /** true si l'appel n'était pas authentifié (pas de cookie de session) → proposer le web. */
  unauthenticated: boolean
}

export type ReservationGatewayResult = ReservationGatewaySuccess | ReservationGatewayFailure

/** Reconstruit l'en-tête Cookie de la requête courante (vide hors contexte web). */
async function currentCookieHeader(): Promise<string> {
  try {
    const store = await cookies()
    return store.getAll().map(c => `${c.name}=${c.value}`).join('; ')
  } catch {
    return ''
  }
}

/**
 * Soumet une réservation via l'endpoint existant, sans le modifier.
 * Toute la logique métier (capacité, justif, conflit créneau, statut) reste
 * celle de `POST /api/reservations`.
 */
export async function submitReservationViaApi(
  payload: ReservationGatewayPayload,
  /** Identité déjà vérifiée par l'agent — sert hors contexte web (WhatsApp), cf. actor-session.ts. */
  actorCjsUid?: string | null,
): Promise<ReservationGatewayResult> {
  const cookie =
    (await currentCookieHeader()) || (actorCjsUid ? (await buildActorCookieHeader(actorCjsUid)) ?? '' : '')
  const req = new NextRequest('http://internal.local/api/reservations', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: JSON.stringify(payload),
  })

  let res: Response
  try {
    res = await createReservationRoute(req)
  } catch (err) {
    logger.warn('[yaye:reserve] appel endpoint réservation échoué', { err: String(err) })
    return { ok: false, code: 'GATEWAY_ERROR', message: 'Service de réservation indisponible.', status: 502, unauthenticated: false }
  }

  const json = (await res.json().catch(() => ({}))) as {
    data?: { reservation?: ReservationGatewaySuccess['reservation'] }
    error?: { code?: string; message?: string }
  }

  if (res.ok && json.data?.reservation) {
    return { ok: true, reservation: json.data.reservation }
  }
  return {
    ok: false,
    code: json.error?.code ?? 'RESERVATION_FAILED',
    message: json.error?.message ?? 'La réservation a échoué.',
    status: res.status,
    unauthenticated: res.status === 401,
  }
}
