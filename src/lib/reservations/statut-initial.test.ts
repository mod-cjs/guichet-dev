/**
 * @jest-environment node
 */
// GUIC-470 — Politique de validation des réservations (salle/véhicule/atelier
// en attente de validation conseiller ; poste/équipement auto-validés).
import { initialReservationStatut, requiertValidation } from './statut-initial'

describe('initialReservationStatut', () => {
  it('met en attente les ressources à fort enjeu', () => {
    expect(initialReservationStatut('Salle')).toBe('EnAttente')
    expect(initialReservationStatut('Vehicule')).toBe('EnAttente')
    expect(initialReservationStatut('Atelier_recurrent')).toBe('EnAttente')
  })

  it('auto-valide les ressources en libre-service', () => {
    expect(initialReservationStatut('Poste_info')).toBe('Acceptee')
    expect(initialReservationStatut('Equipement')).toBe('Acceptee')
  })
})

describe('requiertValidation', () => {
  it('est cohérent avec le statut initial', () => {
    expect(requiertValidation('Salle')).toBe(true)
    expect(requiertValidation('Poste_info')).toBe(false)
  })
})
