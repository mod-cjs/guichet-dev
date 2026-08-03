import { ADMIN_ROLES } from '@/lib/auth/admin-roles'
import { CONSEILLER_ROLE, RECRUTEUR_ROLE } from '@/lib/auth/espace-roles'

/**
 * GUIC-689 — Dérivation des rôles de session pour `/api/dev/login`.
 *
 * La route posait `roles: ['beneficiaire']` en dur : l'espace recruteur était
 * intestable en local (ses 10 routes redirigeaient vers le dashboard jeune) et
 * l'espace conseiller ne passait que par la rétrocompat `AgentCentre` (D2),
 * jamais par le rôle. On dérive donc les rôles de `utilisateurs.role`, qui
 * porte exactement les mêmes chaînes que les claims SSO `cjs_roles`.
 *
 * Politique de refus : tout rôle inconnu retombe sur `beneficiaire` — le
 * dev-login n'accorde jamais un privilège qu'il n'a pas su reconnaître.
 *
 * ⚠️ Cette fonction ne relâche aucune garde : `/api/dev/login` reste protégée
 * par `devLoginAutorise` (APP_ENV=local + ALLOW_DEV_LOGIN=true, 404 sinon).
 */
const ROLE_BENEFICIAIRE = 'beneficiaire'

/** Rôles que le dev-login sait accorder, indexés par valeur en base. */
const ROLES_RECONNUS = new Set<string>([
  ...ADMIN_ROLES,
  CONSEILLER_ROLE,
  RECRUTEUR_ROLE,
  ROLE_BENEFICIAIRE,
])

export function rolesPourDevLogin(role: string | null | undefined): string[] {
  const normalise = (role ?? '').trim().toLowerCase()
  if (!normalise || !ROLES_RECONNUS.has(normalise)) return [ROLE_BENEFICIAIRE]
  // Le rôle bénéficiaire reste toujours présent : les espaces jeune restent
  // accessibles à un conseiller/recruteur qui teste le parcours.
  return normalise === ROLE_BENEFICIAIRE ? [ROLE_BENEFICIAIRE] : [normalise, ROLE_BENEFICIAIRE]
}
