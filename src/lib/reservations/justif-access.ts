// GUIC-565 (F1) — Qui peut lire un justificatif de réservation.
//
// Un justificatif est un document PERSONNEL (certificat, attestation…). Il n'est jamais servi
// en direct ni publiquement : la lecture passe par le proxy /api/reservations/[id]/justif, qui
// vérifie cette autorisation avant de streamer le contenu.

export interface JustifAccessInput {
  /** cjs_uid de la session (null si non authentifié). */
  sessionCjsUid: string | null
  /** Propriétaire de la réservation. */
  reservationCjsUid: string
  /** Centre de la réservation. */
  reservationCentreId: string
  /** Centre auquel la session est rattachée comme conseiller (null sinon). */
  conseillerCentreId: string | null
}

/**
 * Un justificatif est lisible par :
 *  - le PROPRIÉTAIRE de la réservation ;
 *  - un CONSEILLER rattaché au MÊME centre que la réservation.
 * Tout le reste est refusé (y compris session absente).
 */
export function peutVoirJustif(input: JustifAccessInput): boolean {
  if (!input.sessionCjsUid) return false
  if (input.sessionCjsUid === input.reservationCjsUid) return true
  return input.conseillerCentreId !== null && input.conseillerCentreId === input.reservationCentreId
}
