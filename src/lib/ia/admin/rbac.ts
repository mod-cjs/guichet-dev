// RBAC des surfaces admin Yaye (Lot 6/7, GUIC-259).
// La file d'escalade et la notation sont des outils MÉTIER : les conseillers et
// directeurs (destinataires des escalades, cf. ADVISOR_ROLES de escalade.ts) doivent
// pouvoir traiter une escalade et noter une conversation, pas seulement les admins.

export const YAYE_STAFF_ROLES = ['admin', 'directeur', 'conseiller'] as const

/** Vrai si l'utilisateur peut opérer les outils Yaye (traiter escalades, noter sessions). */
export function canManageYaye(roles: string[] | undefined | null): boolean {
  if (!roles) return false
  return roles.some((r) => (YAYE_STAFF_ROLES as readonly string[]).includes(r))
}
