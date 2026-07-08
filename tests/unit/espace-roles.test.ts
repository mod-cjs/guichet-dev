/**
 * @jest-environment node
 *
 * GUIC-526 — source unique des rôles d'espace conseiller/recruteur.
 * RED : `espace-roles.ts` n'est encore qu'un stub.
 */
import {
  isConseillerRole,
  isRecruteurRole,
  rolePrincipal,
  resolveConseillerAccess,
  resolveRecruteurAccess,
} from '@/lib/auth/espace-roles'

describe('isConseillerRole / isRecruteurRole', () => {
  it('reconnaît le rôle conseiller', () => {
    expect(isConseillerRole(['conseiller'])).toBe(true)
    expect(isConseillerRole(['beneficiaire', 'conseiller'])).toBe(true)
  })

  it('reconnaît le rôle recruteur', () => {
    expect(isRecruteurRole(['recruteur'])).toBe(true)
    expect(isRecruteurRole(['beneficiaire', 'recruteur'])).toBe(true)
  })

  it('rejette les autres rôles, listes vides, null et undefined', () => {
    expect(isConseillerRole(['recruteur', 'admin'])).toBe(false)
    expect(isRecruteurRole(['conseiller', 'beneficiaire'])).toBe(false)
    expect(isConseillerRole([])).toBe(false)
    expect(isRecruteurRole([])).toBe(false)
    expect(isConseillerRole(null)).toBe(false)
    expect(isRecruteurRole(undefined)).toBe(false)
  })
})

describe('rolePrincipal — priorité admin > recruteur > conseiller > bénéficiaire', () => {
  it('un rôle admin-family gagne toujours et est retourné tel quel', () => {
    expect(rolePrincipal(['conseiller', 'admin'])).toBe('admin')
    expect(rolePrincipal(['recruteur', 'super_admin'])).toBe('super_admin')
    expect(rolePrincipal(['moderator'])).toBe('moderator')
  })

  it('recruteur avant conseiller, conseiller avant bénéficiaire', () => {
    expect(rolePrincipal(['conseiller', 'recruteur'])).toBe('recruteur')
    expect(rolePrincipal(['beneficiaire', 'conseiller'])).toBe('conseiller')
  })

  it('rôle bénéficiaire retourné tel quel (jeune, chercheur_d_emploi…)', () => {
    expect(rolePrincipal(['jeune'])).toBe('jeune')
    expect(rolePrincipal(['beneficiaire'])).toBe('beneficiaire')
  })

  it('rôle inconnu seul → retourné en fallback ; liste vide → null', () => {
    expect(rolePrincipal(['formateur'])).toBe('formateur')
    expect(rolePrincipal([])).toBeNull()
  })
})

describe('resolveConseillerAccess (D1/D2)', () => {
  it('pas de session → connexion', () => {
    expect(
      resolveConseillerAccess({ hasSession: false, roles: [], hasRattachement: false }),
    ).toBe('connexion')
  })

  it('rattachement AgentCentre → ok, même sans rôle SSO (rétrocompat D2)', () => {
    expect(
      resolveConseillerAccess({ hasSession: true, roles: [], hasRattachement: true }),
    ).toBe('ok')
    expect(
      resolveConseillerAccess({ hasSession: true, roles: ['conseiller'], hasRattachement: true }),
    ).toBe('ok')
  })

  it('rôle SSO conseiller sans rattachement → attente (D1)', () => {
    expect(
      resolveConseillerAccess({ hasSession: true, roles: ['conseiller'], hasRattachement: false }),
    ).toBe('attente')
  })

  it('ni rôle ni rattachement → accueil', () => {
    expect(
      resolveConseillerAccess({ hasSession: true, roles: ['beneficiaire'], hasRattachement: false }),
    ).toBe('accueil')
  })
})

describe('resolveRecruteurAccess (D4)', () => {
  it('pas de session ou pas de rôle recruteur → connexion', () => {
    expect(
      resolveRecruteurAccess({ hasSession: false, roles: [], hasOrganisation: false }),
    ).toBe('connexion')
    expect(
      resolveRecruteurAccess({ hasSession: true, roles: ['beneficiaire'], hasOrganisation: true }),
    ).toBe('connexion')
  })

  it('rôle + organisation liée → ok', () => {
    expect(
      resolveRecruteurAccess({ hasSession: true, roles: ['recruteur'], hasOrganisation: true }),
    ).toBe('ok')
  })

  it('rôle sans organisation → attente (D4)', () => {
    expect(
      resolveRecruteurAccess({ hasSession: true, roles: ['recruteur'], hasOrganisation: false }),
    ).toBe('attente')
  })
})
