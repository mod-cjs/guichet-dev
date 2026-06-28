/**
 * U-M1 — deriveRole : rôle réel à partir de signaux fiables, au lieu du cache SSO
 * (null pour la plupart → tout paraissait « Bénéficiaire »).
 */
import { deriveRole } from '@/lib/loaders/derive-role'

describe('deriveRole', () => {
  it('rôle admin en cache → prioritaire (fiable, jamais null pour eux)', () => {
    expect(deriveRole({ cachedRole: 'admin', isAgent: true, isRecruteur: true })).toBe('admin')
    expect(deriveRole({ cachedRole: 'data_steward', isAgent: false, isRecruteur: false })).toBe('data_steward')
  })

  it('recruteur (Organisation) prioritaire sur conseiller', () => {
    expect(deriveRole({ cachedRole: null, isAgent: true, isRecruteur: true })).toBe('recruteur')
    expect(deriveRole({ cachedRole: null, isAgent: false, isRecruteur: true })).toBe('recruteur')
  })

  it('conseiller si membre d’un centre (AgentCentre)', () => {
    expect(deriveRole({ cachedRole: null, isAgent: true, isRecruteur: false })).toBe('conseiller')
  })

  it('rôle en cache non-admin utilisé si aucun signal structurel', () => {
    expect(deriveRole({ cachedRole: 'beneficiaire', isAgent: false, isRecruteur: false })).toBe('beneficiaire')
  })

  it('défaut bénéficiaire quand tout est inconnu (au lieu d’affirmer à tort)', () => {
    expect(deriveRole({ cachedRole: null, isAgent: false, isRecruteur: false })).toBe('beneficiaire')
  })

  it('un signal structurel l’emporte sur un cache « beneficiaire » obsolète', () => {
    // Un conseiller jamais resynchronisé (cache=beneficiaire) est bien vu Conseiller.
    expect(deriveRole({ cachedRole: 'beneficiaire', isAgent: true, isRecruteur: false })).toBe('conseiller')
  })
})
