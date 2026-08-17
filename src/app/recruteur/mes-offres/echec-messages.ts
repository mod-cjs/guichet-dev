import type { CreerOffreEchec } from './actions'

/**
 * GUIC-706 — messages utilisateur pour les échecs de création d'offre (codes retournés
 * par `creerOffreRecruteur`). Le gate de publication (org suspendue / membre révoqué /
 * compte inactif) doit s'expliquer clairement, pas s'afficher en code brut.
 */
export const MESSAGE_ECHEC_OFFRE: Record<CreerOffreEchec, string> = {
  NO_ORGANISATION: "Aucune organisation n'est rattachée à votre compte. Contactez le CJS pour être rattaché·e à votre structure.",
  VALIDATION: 'Vérifiez les champs obligatoires (titre, description, type de contrat / durée).',
  ORG_SUSPENDUE: 'Votre organisation est actuellement suspendue : la publication d’offres est bloquée. Contactez le CJS.',
  PERSONNE_INACTIVE: 'Votre compte est inactif : vous ne pouvez pas publier d’offre. Contactez le CJS.',
  NON_MEMBRE: "Vous n'êtes pas rattaché·e à cette organisation. Contactez le CJS.",
  MEMBRE_INACTIF: 'Votre accès à cette organisation a été révoqué : publication impossible. Contactez le CJS.',
}
