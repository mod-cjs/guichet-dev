/**
 * U-M1 — dérive le rôle RÉEL d'un compte à partir de signaux fiables, plutôt que
 * d'afficher le rôle cache-SSO (null pour la plupart des comptes legacy → tout
 * paraissait « Bénéficiaire »).
 *
 * Priorité :
 *   1. rôle administratif en cache (admin/data_steward…) — fiable (l'admin s'est
 *      connecté AVEC ce rôle, jamais null pour eux) ;
 *   2. recruteur — possède une `Organisation` (Organisation.cjsUid) ;
 *   3. conseiller — membre d'un centre (`AgentCentre.cjsUid`) ;
 *   4. autre rôle en cache s'il existe ;
 *   5. par défaut : bénéficiaire.
 */
const ADMINISH = new Set(['admin', 'moderator', 'super_admin', 'data_steward'])

export function deriveRole(input: {
  cachedRole: string | null
  isAgent: boolean
  isRecruteur: boolean
}): string {
  const { cachedRole, isAgent, isRecruteur } = input
  if (cachedRole && ADMINISH.has(cachedRole)) return cachedRole
  if (isRecruteur) return 'recruteur'
  if (isAgent) return 'conseiller'
  if (cachedRole) return cachedRole
  return 'beneficiaire'
}
