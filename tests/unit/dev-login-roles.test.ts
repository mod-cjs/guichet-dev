/**
 * GUIC-689 — `/api/dev/login` doit refléter le rôle réel de l'utilisateur.
 *
 * Défaut constaté au balayage fonctionnel : la route posait
 * `roles: ['beneficiaire']` en dur. Conséquence — les 10 routes de l'espace
 * recruteur redirigeaient toutes vers `/jeune/tableau-de-bord`, quel que soit
 * le compte utilisé : l'espace recruteur était **intestable en local**.
 * (L'espace conseiller passait par raccroc, via la rétrocompat `AgentCentre`
 * D2, pas via le rôle.)
 *
 * On dérive donc les rôles de la colonne `utilisateurs.role`, qui porte
 * exactement les mêmes chaînes que les claims SSO (`conseiller`, `recruteur`,
 * `admin`, `beneficiaire`).
 *
 * ⚠️ Cette route reste gardée par `devLoginAutorise` (404 hors local) : elle
 * n'élargit aucune surface d'attaque en production.
 */
import { rolesPourDevLogin } from '@/lib/auth/dev-login-roles'
import { isConseillerRole, isRecruteurRole, BENEFICIAIRE_ROLES } from '@/lib/auth/espace-roles'
import { isAdminRole } from '@/lib/auth/admin-roles'

describe('GUIC-689 — rôles du dev-login dérivés de la base', () => {
  it('un conseiller obtient un rôle reconnu par la garde conseiller', () => {
    expect(isConseillerRole(rolesPourDevLogin('conseiller'))).toBe(true)
  })

  it('un recruteur obtient un rôle reconnu par la garde recruteur', () => {
    expect(isRecruteurRole(rolesPourDevLogin('recruteur'))).toBe(true)
  })

  it('un admin obtient un rôle reconnu par la garde admin', () => {
    expect(isAdminRole(rolesPourDevLogin('admin'))).toBe(true)
  })

  it('un rôle absent en base retombe sur bénéficiaire (les 20 000 comptes migrés)', () => {
    const roles = rolesPourDevLogin(null)
    expect(roles.some((r) => BENEFICIAIRE_ROLES.has(r))).toBe(true)
  })

  it('la casse et les espaces de la base ne cassent pas la dérivation', () => {
    expect(isRecruteurRole(rolesPourDevLogin('  Recruteur '))).toBe(true)
  })

  it('un rôle inconnu ne donne aucun privilège au-delà de bénéficiaire', () => {
    const roles = rolesPourDevLogin('quelque_chose_dinconnu')
    expect(isAdminRole(roles)).toBe(false)
    expect(isRecruteurRole(roles)).toBe(false)
    expect(isConseillerRole(roles)).toBe(false)
    expect(roles.some((r) => BENEFICIAIRE_ROLES.has(r))).toBe(true)
  })

  it('un bénéficiaire n’obtient jamais un rôle d’administration', () => {
    expect(isAdminRole(rolesPourDevLogin('beneficiaire'))).toBe(false)
  })

  /**
   * Sentinelle : le défaut d'origine était une liste de rôles écrite en dur
   * dans la route. Tester la seule fonction pure laisserait la route libre de
   * régresser sans qu'aucun test ne bronche.
   */
  it('la route dev-login appelle bien la dérivation, sans liste en dur', () => {
    const { readFileSync } = jest.requireActual('node:fs') as typeof import('node:fs')
    const { resolve } = jest.requireActual('node:path') as typeof import('node:path')
    const src = readFileSync(resolve(__dirname, '../../src/app/api/dev/login/route.ts'), 'utf-8')
    expect(src).toMatch(/roles:\s*rolesPourDevLogin\(/)
    expect(src).not.toMatch(/roles:\s*\[/)
  })
})
