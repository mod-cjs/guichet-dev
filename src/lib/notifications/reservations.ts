/**
 * Notifications réservations centre — placeholder MVP (W4).
 *
 * TODO Sprint+1 :
 * - SMS Orange Sénégal au jeune (template confirmation + rappel J-1 / H-1)
 * - Email vers `centre.email` (template HTML)
 * - File d'attente Redis pour retry
 *
 * Pour l'instant : log applicatif uniquement. L'idée est de tracer l'appel
 * côté API sans bloquer la création de la réservation.
 */

import { logger } from '@/lib/logger'

export interface NotifyReservationPayload {
  reservationId: string
  cjsUid: string
  centreId: string
  ressourceNom: string
  dateReservee: Date
  creneauDebut: string
  creneauFin: string
}

export type NotifyReservationKind = 'created' | 'reminder' | 'cancelled'

/**
 * Notification fail-soft : ne throw jamais — un échec ne doit pas bloquer
 * le flow de création de réservation.
 */
export async function notifyReservation(
  payload: NotifyReservationPayload,
  kind: NotifyReservationKind,
): Promise<void> {
  try {
    logger.info('[notify-reservation] mock', {
      kind,
      reservationId: payload.reservationId,
      cjsUid: payload.cjsUid,
      centreId: payload.centreId,
    })
    // TODO: brancher SMS Orange + email centre Sprint+1.
  } catch (err) {
    logger.warn('[notify-reservation] échec fail-soft', {
      kind,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}
