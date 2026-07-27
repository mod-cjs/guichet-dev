// Ce que Yaye promet quand elle passe la main (vague 1.2 — audit du 26/07).
//
// Elle annonçait « un conseiller va te répondre ici même ». C'était FAUX : aucune route
// ne permet à un conseiller de répondre dans le fil — la file d'escalade n'offre que
// « prendre en charge » et « marquer résolue ». Et la promesse était faite sur le chemin
// des signalements de danger, celui où l'on peut le moins se permettre d'être approximatif.
//
// Tant que le canal de réponse n'existe pas, on dit ce qui est vrai : l'équipe est
// alertée, elle recontactera la personne — sans dire ni où, ni quand.
//
// ⚠️ Quand la réponse conseiller sera livrée (option A1), c'est ICI qu'il faudra
// reformuler, et nulle part ailleurs : tous les points d'escalade passent par ce module.

/** Recours joignable immédiatement, INDÉPENDANT du CJS. Données publiques uniquement. */
export interface RessourceUrgence {
  libelle: string
  numero: string
}

/**
 * Numéros publics d'urgence au Sénégal. Volontairement courts et mémorisables : une
 * personne en détresse ne lit pas une liste. Jamais de contact nominatif — ce sont des
 * services, pas des personnes.
 */
export const DANGER_RESSOURCES: RessourceUrgence[] = [
  { libelle: 'Police secours', numero: '17' },
  { libelle: 'Sapeurs-pompiers', numero: '18' },
  { libelle: 'SAMU national', numero: '1515' },
]

export interface EscaladeContexte {
  /** L'escalade fait suite à un signal de danger. */
  danger: boolean
  /** Une escalade non résolue existe déjà pour cette conversation. */
  dejaEnCours: boolean
}

/**
 * Message d'accusé de réception. Ne promet QUE ce que le système tient réellement :
 * l'alerte est partie, quelqu'un reprendra contact. Aucun délai, aucun canal annoncé.
 */
export function escaladeMessage({ danger, dejaEnCours }: EscaladeContexte): string {
  if (danger) {
    const secours = DANGER_RESSOURCES.map(r => `${r.libelle} ${r.numero}`).join(' · ')
    const tete = dejaEnCours
      ? "L'équipe du CJS est déjà alertée et va te recontacter."
      : "J'ai alerté l'équipe du CJS : une personne de confiance va te recontacter."
    return `${tete} Si tu es en danger immédiat, appelle tout de suite : ${secours}.`
  }
  return dejaEnCours
    ? "Ta demande est déjà remontée à l'équipe du CJS ; elle va te recontacter. Garde la référence si tu veux la rappeler."
    : "J'ai transmis ta demande à l'équipe du CJS, qui va te recontacter. Garde la référence si tu veux la rappeler."
}

/** Titre de la carte d'accusé de réception, accordé au contexte. */
export function escaladeTitre({ dejaEnCours }: Pick<EscaladeContexte, 'dejaEnCours'>): string {
  return dejaEnCours ? 'Ta demande est déjà remontée' : 'Demande transmise à l’équipe CJS'
}
