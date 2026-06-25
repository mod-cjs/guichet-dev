/**
 * Audit E2 — isAdminRole : définition UNIQUE des rôles d'administration, partagée
 * par middleware + callback + 20 gardes de pages/routes (fin de l'impasse pour
 * moderator/super_admin qui passaient le middleware mais étaient rejetés par les pages).
 */
import { isAdminRole, ADMIN_ROLES } from '@/lib/auth/admin-roles'

describe('isAdminRole (E2)', () => {
  it('accepte admin, moderator et super_admin', () => {
    expect(isAdminRole(['admin'])).toBe(true)
    expect(isAdminRole(['moderator'])).toBe(true)
    expect(isAdminRole(['super_admin'])).toBe(true)
    expect(isAdminRole(['beneficiaire', 'super_admin'])).toBe(true)
  })

  it('refuse les rôles non-admin', () => {
    expect(isAdminRole(['beneficiaire'])).toBe(false)
    expect(isAdminRole(['recruteur'])).toBe(false)
    expect(isAdminRole(['conseiller'])).toBe(false)
  })

  it('refuse null / undefined / liste vide (fail-closed)', () => {
    expect(isAdminRole(null)).toBe(false)
    expect(isAdminRole(undefined)).toBe(false)
    expect(isAdminRole([])).toBe(false)
  })

  it('la même source ADMIN_ROLES est utilisée (cohérence middleware/pages)', () => {
    expect(ADMIN_ROLES.has('admin')).toBe(true)
    expect(ADMIN_ROLES.has('moderator')).toBe(true)
    expect(ADMIN_ROLES.has('super_admin')).toBe(true)
  })
})
