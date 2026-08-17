// GUIC-706 — Qui a le droit de voir et de basculer une fonctionnalité.
//
// POURQUOI UNE GARDE DÉDIÉE. `ADMIN_ROLES` vaut {admin, moderator, super_admin} et sert
// de garde à toute la console. Or masquer une fonctionnalité n'est pas du même ordre que
// valider une offre : c'est un acte qui change ce que voient 22 000 utilisateurs, sans
// déploiement et donc sans revue. Réutiliser `isAdminRole` pour l'écriture donnerait ce
// pouvoir au modérateur.
//
// Le dépôt connaît déjà ce besoin : `src/lib/ia/admin/rbac.ts` restreint deux routes Yaye
// à un sous-ensemble différent d'`ADMIN_ROLES`. Même patron ici.

import { isAdminRole } from '@/lib/auth/admin-roles'

/** Rôles autorisés à basculer une fonctionnalité. Volontairement plus étroit qu'`ADMIN_ROLES`. */
const FLAG_WRITE_ROLES = new Set(['admin', 'super_admin'])

/**
 * Consultation de l'état des fonctionnalités.
 *
 * Ouverte à toute l'administration, modérateur compris : sans cela, un modérateur devant
 * une file vide conclurait à une panne au lieu de constater que le module est masqué.
 */
export function canViewFlags(roles: readonly string[] | null | undefined): boolean {
  return isAdminRole(roles)
}

/** Bascule d'une fonctionnalité — administration nationale seulement. */
export function canManageFlags(roles: readonly string[] | null | undefined): boolean {
  return !!roles && roles.some((r) => FLAG_WRITE_ROLES.has(r))
}
