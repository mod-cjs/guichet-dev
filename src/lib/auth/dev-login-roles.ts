/**
 * GUIC-689 — Dérivation des rôles de session pour `/api/dev/login`.
 *
 * ⚠️ Comportement actuel reproduit tel quel : la route pose `beneficiaire`
 * en dur, quel que soit l'utilisateur. Voir `tests/unit/dev-login-roles.test.ts`
 * pour le défaut que cela provoque (espace recruteur intestable en local).
 */
export function rolesPourDevLogin(_role: string | null): string[] {
  return ['beneficiaire']
}
