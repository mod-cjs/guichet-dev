/**
 * @jest-environment node
 *
 * Tests de la matrice admin (GUIC-550) : fusion catalogue + surcharges, validation.
 */
import { buildEventMatrix, validateChannelSelection } from '@/lib/notifications/matrix'
import { listEvents } from '@/lib/notifications/catalog'

describe('buildEventMatrix', () => {
  it('produit une cellule par couple (événement × rôle applicable)', () => {
    const expected = listEvents().reduce((n, e) => n + e.roles.length, 0)
    expect(buildEventMatrix([]).length).toBe(expected)
  })

  it('sans surcharge, reflète les canaux par défaut du catalogue', () => {
    const cell = buildEventMatrix([]).find(
      (c) => c.eventKey === 'candidature.statut_change' && c.role === 'beneficiaire',
    )
    expect(cell).toMatchObject({ isOverride: false, actif: true, canaux: ['in_app', 'whatsapp'] })
  })

  it('applique une surcharge admin par-dessus le défaut', () => {
    const cells = buildEventMatrix([
      { eventKey: 'candidature.statut_change', role: 'beneficiaire', canaux: ['in_app', 'sms'], actif: true },
    ])
    const cell = cells.find((c) => c.eventKey === 'candidature.statut_change' && c.role === 'beneficiaire')
    expect(cell).toMatchObject({ isOverride: true, canaux: ['in_app', 'sms'] })
  })

  it('remonte actif=false depuis la surcharge', () => {
    const cells = buildEventMatrix([
      { eventKey: 'message.received', role: 'beneficiaire', canaux: ['in_app'], actif: false },
    ])
    expect(cells.find((c) => c.eventKey === 'message.received' && c.role === 'beneficiaire')?.actif).toBe(false)
  })
})

describe('validateChannelSelection', () => {
  it('accepte et déduplique une sélection valide', () => {
    expect(
      validateChannelSelection('candidature.statut_change', 'beneficiaire', ['in_app', 'sms', 'in_app']),
    ).toEqual(['in_app', 'sms'])
  })

  it('rejette un événement inconnu', () => {
    expect(() => validateChannelSelection('inconnu.x', 'beneficiaire', ['in_app'])).toThrow(/inconnu/i)
  })

  it('rejette un rôle non applicable à l’événement', () => {
    // candidature.statut_change ne cible que le bénéficiaire
    expect(() => validateChannelSelection('candidature.statut_change', 'recruteur', ['in_app'])).toThrow(/non applicable/i)
  })

  it('rejette un canal invalide', () => {
    expect(() => validateChannelSelection('candidature.statut_change', 'beneficiaire', ['pigeon'])).toThrow(/invalide/i)
  })
})
