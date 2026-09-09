/**
 * GUIC-153 — Rôles E2E et chemins de `storageState` (session réutilisée, login une seule fois).
 * Un fichier par identité, produit par `auth.setup.ts`, consommé par les specs via `test.use`.
 */

import path from 'path'

/** Rôles SSO (le mock émet les claims correspondantes selon le cookie `e2e_role`). */
export const E2E_ROLES = ['jeune', 'jeune-onb', 'recruteur', 'admin', 'conseiller'] as const
export type E2ERole = (typeof E2E_ROLES)[number]

/** Slug stable du centre seedé (onboarding + conseiller + staff). */
export const E2E_CENTRE_SLUG = 'e2e-centre-principal'

/** Email staff whitelisté (doit figurer dans CONSEILLER_STAFF_EMAILS). */
export const E2E_STAFF_EMAIL = 'staff.e2e@cjs.sn'

const AUTH_DIR = path.join(process.cwd(), 'tests/e2e/.auth')

/** Chemin du storageState d'un rôle (SSO) ou du staff centre. */
export function storageStatePath(role: E2ERole | 'staff'): string {
  return path.join(AUTH_DIR, `${role}.json`)
}
