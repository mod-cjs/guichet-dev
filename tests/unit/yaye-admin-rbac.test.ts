/**
 * @jest-environment node
 *
 * RBAC des outils Yaye (GUIC-259) : admin/directeur/conseiller peuvent opérer la
 * file d'escalade et la notation ; les autres rôles non.
 */

import { canManageYaye } from '@/lib/ia/admin/rbac'

it('autorise admin, directeur et conseiller', () => {
  expect(canManageYaye(['admin'])).toBe(true)
  expect(canManageYaye(['directeur'])).toBe(true)
  expect(canManageYaye(['conseiller'])).toBe(true)
  expect(canManageYaye(['beneficiaire', 'conseiller'])).toBe(true)
})

it('refuse les autres rôles et les rôles vides/absents', () => {
  expect(canManageYaye(['beneficiaire'])).toBe(false)
  expect(canManageYaye(['recruteur'])).toBe(false)
  expect(canManageYaye([])).toBe(false)
  expect(canManageYaye(null)).toBe(false)
  expect(canManageYaye(undefined)).toBe(false)
})
