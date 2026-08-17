/**
 * GUIC-706 — chaque code d'échec de création d'offre a un message clair et non vide,
 * distinct du code brut. Évite qu'un blocage du gate s'affiche en jargon (« ORG_SUSPENDUE »).
 */
import { MESSAGE_ECHEC_OFFRE } from '@/app/recruteur/mes-offres/echec-messages'

const CODES = ['NO_ORGANISATION', 'VALIDATION', 'ORG_SUSPENDUE', 'PERSONNE_INACTIVE', 'NON_MEMBRE', 'MEMBRE_INACTIF'] as const

describe('GUIC-706 — MESSAGE_ECHEC_OFFRE', () => {
  it.each(CODES)('le code %s a un message lisible', (code) => {
    const msg = MESSAGE_ECHEC_OFFRE[code]
    expect(typeof msg).toBe('string')
    expect(msg.length).toBeGreaterThan(10)
    expect(msg).not.toBe(code)
  })

  it('couvre exactement les codes attendus (pas d’oubli)', () => {
    expect(Object.keys(MESSAGE_ECHEC_OFFRE).sort()).toEqual([...CODES].sort())
  })
})
