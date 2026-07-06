/**
 * GUIC-526 — Rôles d'espace `conseiller` / `recruteur` attribués via le SSO.
 *
 * Source UNIQUE des vérifications de rôle d'espace (même principe que
 * `admin-roles.ts` issu de l'audit E2) : middleware, callback, layouts et
 * actions importent d'ici — jamais de `roles.includes(...)` inline.
 *
 * Le SSO dit *qui a le rôle* (claim `cjs_roles` → `session.roles`) ; Guichet
 * dit *sur quoi il porte* (`AgentCentre` pour le centre du conseiller,
 * `Organisation.cjsUid` pour l'organisation du recruteur).
 * Spec : `.agent_context/specs/M8-roles-sso-conseiller-recruteur.md`.
 */

import { ADMIN_ROLES } from '@/lib/auth/admin-roles'

export const CONSEILLER_ROLE = 'conseiller'
export const RECRUTEUR_ROLE = 'recruteur'

/** Rôles bénéficiaires — dupliqués du middleware, à unifier ici (source unique). */
export const BENEFICIAIRE_ROLES = new Set(['beneficiaire', 'jeune', 'chercheur_d_emploi'])

export function isConseillerRole(roles: readonly string[] | null | undefined): boolean {
  void roles
  throw new Error('TODO GUIC-526')
}

export function isRecruteurRole(roles: readonly string[] | null | undefined): boolean {
  void roles
  throw new Error('TODO GUIC-526')
}

/**
 * Rôle principal à mettre en cache dans `Utilisateur.role` (affichage admin
 * uniquement — JAMAIS une source d'autorisation). Priorité :
 * admin-family > recruteur > conseiller > bénéficiaire-family > premier rôle.
 * Retourne le rôle réellement porté (ex. `super_admin`, pas `admin`).
 */
export function rolePrincipal(roles: readonly string[]): string | null {
  void roles
  throw new Error('TODO GUIC-526')
}

export type EspaceAccess = 'connexion' | 'accueil' | 'attente' | 'ok'

/**
 * Guard de l'espace conseiller (décisions D1/D2 spec GUIC-526) :
 * - pas de session               → 'connexion'
 * - rattachement AgentCentre     → 'ok'   (rétrocompat D2 : rôle SSO non requis)
 * - rôle SSO sans rattachement   → 'attente' (écran dédié D1)
 * - ni rôle ni rattachement      → 'accueil'
 */
export function resolveConseillerAccess(args: {
  hasSession: boolean
  roles: readonly string[]
  hasRattachement: boolean
}): EspaceAccess {
  void args
  throw new Error('TODO GUIC-526')
}

/**
 * Guard de l'espace recruteur (décision D4) :
 * - pas de session ou pas de rôle recruteur → 'connexion'
 * - organisation liée                       → 'ok'
 * - rôle sans organisation                  → 'attente'
 */
export function resolveRecruteurAccess(args: {
  hasSession: boolean
  roles: readonly string[]
  hasOrganisation: boolean
}): EspaceAccess {
  void args
  throw new Error('TODO GUIC-526')
}
