'use server'

/**
 * GUIC-526 — Actions admin « Rôles & rattachements » (fiche utilisateur).
 *
 * L'admin PROVISIONNE les périmètres (supervision, cf feedback_roles_candidatures) :
 * - rattacher/retirer un conseiller à un centre (`AgentCentre`)
 * - lier/créer l'organisation d'un recruteur (`Organisation.cjsUid`)
 * Le RÔLE lui-même s'attribue dans l'admin SSO (claim `cjs_roles`) — jamais ici.
 *
 * Toute action est journalisée via `recordAudit` (trail admin).
 */

export interface ActionResult {
  ok: boolean
  /** Code d'erreur stable pour l'UI : FORBIDDEN | VALIDATION | DEJA_RATTACHE | INTROUVABLE */
  error?: string
}

export async function ajouterRattachementCentre(input: {
  cjsUid: string
  centreId: string
  role?: string
}): Promise<ActionResult> {
  void input
  throw new Error('TODO GUIC-526')
}

export async function retirerRattachementCentre(id: string): Promise<ActionResult> {
  void id
  throw new Error('TODO GUIC-526')
}

export async function lierOrganisation(input: {
  cjsUid: string
  organisationId: string
}): Promise<ActionResult> {
  void input
  throw new Error('TODO GUIC-526')
}

export async function creerOrganisationPourRecruteur(input: {
  cjsUid: string
  nom: string
}): Promise<ActionResult> {
  void input
  throw new Error('TODO GUIC-526')
}
