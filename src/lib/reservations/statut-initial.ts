import type { StatutReservation, TypeRessourceCentre } from '@prisma/client'

/**
 * GUIC-470 — Politique de validation des réservations de ressources.
 *
 * Décision produit (2026-07-03, épic Espace conseiller) : les ressources à
 * fort enjeu partagé (salle, véhicule, atelier récurrent) requièrent la
 * validation d'un conseiller → créées en `EnAttente`. Les ressources en
 * libre-service (poste informatique, équipement) restent auto-validées
 * (`Acceptee`), conformément au MVP Lot 7.
 *
 * Ce choix « réactive » le workflow d'approbation sans migration : c'est ce qui
 * alimente la file « Réservations à valider » du dashboard conseiller.
 */
const REQUIERT_VALIDATION: ReadonlySet<TypeRessourceCentre> = new Set<TypeRessourceCentre>([
  'Salle',
  'Vehicule',
  'Atelier_recurrent',
])

/** Statut initial d'une réservation selon le type de ressource. */
export function initialReservationStatut(type: TypeRessourceCentre): StatutReservation {
  return REQUIERT_VALIDATION.has(type) ? 'EnAttente' : 'Acceptee'
}

/** Une réservation créée dans ce statut requiert-elle encore une décision ? */
export function requiertValidation(type: TypeRessourceCentre): boolean {
  return REQUIERT_VALIDATION.has(type)
}
