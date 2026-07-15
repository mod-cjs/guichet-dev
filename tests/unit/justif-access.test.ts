/**
 * @jest-environment node
 *
 * GUIC-565 (F1) — Autorisation de lecture d'un justificatif de réservation.
 *
 * Un justificatif est un DOCUMENT PERSONNEL. Il n'est servi ni en direct ni publiquement :
 * seul le PROPRIÉTAIRE de la réservation, ou un CONSEILLER rattaché au centre concerné, peut
 * le lire (via le proxy autorisé /api/reservations/[id]/justif).
 */
import { peutVoirJustif } from '@/lib/reservations/justif-access'

describe('GUIC-565 (F1) — peutVoirJustif', () => {
  const base = {
    reservationCjsUid: 'jeune-1',
    reservationCentreId: 'centre-A',
  }

  it('autorise le propriétaire de la réservation', () => {
    expect(peutVoirJustif({ ...base, sessionCjsUid: 'jeune-1', conseillerCentreId: null })).toBe(true)
  })

  it('autorise un conseiller rattaché AU MÊME centre', () => {
    expect(peutVoirJustif({ ...base, sessionCjsUid: 'agent-9', conseillerCentreId: 'centre-A' })).toBe(true)
  })

  it("refuse un conseiller d'un AUTRE centre", () => {
    expect(peutVoirJustif({ ...base, sessionCjsUid: 'agent-9', conseillerCentreId: 'centre-B' })).toBe(false)
  })

  it('refuse un tiers sans lien (ni propriétaire ni conseiller)', () => {
    expect(peutVoirJustif({ ...base, sessionCjsUid: 'jeune-2', conseillerCentreId: null })).toBe(false)
  })

  it('refuse si la session est absente', () => {
    expect(peutVoirJustif({ ...base, sessionCjsUid: null, conseillerCentreId: null })).toBe(false)
  })
})
