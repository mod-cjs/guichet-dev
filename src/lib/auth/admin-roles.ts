/**
 * Rôles donnant accès à l'espace d'administration — source UNIQUE (cf audit E2).
 *
 * Avant : le middleware et le callback acceptaient {admin, moderator, super_admin},
 * mais chaque page admin gardait par `roles.includes('admin')` strict → un
 * moderator/super_admin passait le middleware puis était renvoyé vers /auth/connexion
 * par la page (impasse). Ce module unifie la définition pour middleware + callback +
 * pages + routes API admin.
 */
export const ADMIN_ROLES = new Set(['admin', 'moderator', 'super_admin'])

/** True si la liste de rôles SSO contient au moins un rôle d'administration. */
export function isAdminRole(roles: readonly string[] | null | undefined): boolean {
  return !!roles && roles.some((r) => ADMIN_ROLES.has(r))
}
