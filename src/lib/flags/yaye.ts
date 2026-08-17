// GUIC-706 — Yaye et les modules masqués (niveau 1).
//
// L'agent expose 17 outils, dont 13 puisent dans des modules masquables. Sans garde, il
// propose spontanément des événements d'un agenda fermé — et le lien de sa card mène à un
// 404 posé par le gate.
//
// LA GARDE EST À L'EXÉCUTION, PAS AU CATALOGUE D'OUTILS. Elle supprime la fuite de
// DONNÉES : l'outil ne rend rien, et l'agent reformule l'échec avec ses mots comme il le
// fait déjà pour toute panne d'outil.
//
// Le niveau 2 (`outilsMasques` ci-dessous, consommé par `construireSystemPrompt`) retire
// en plus l'outil du registre, des définitions envoyées au modèle et des zones du prompt
// qui le nomment. RÉSIDU MESURÉ : le nom de l'outil disparaît, mais le prompt décrit aussi
// le produit en PROSE FRANÇAISE — section « Ta mission », dialogues d'exemple — hors des
// zones paramétrées. Une mesure du 2026-08-15 compte encore 1 mention pour l'agenda, 3
// pour la bibliothèque, 9 pour les centres, 19 pour les opportunités. Yaye peut donc
// nommer le concept sans jamais pouvoir agir dessus ni en tirer la moindre donnée.
//
// Ce résidu n'est pas traité, et c'est délibéré : le prompt fait 779 lignes, son réglage
// est empirique — le code mesure 7/24 appels d'outil sous un prompt contre 23/24 sous
// l'autre — et paramétrer sa narration reviendrait à le réécrire sans pouvoir mesurer la
// régression a posteriori.

import { getFlags } from '@/lib/flags'
import { logger } from '@/lib/logger'
import { getFlagDef, resolveAudience } from './catalog'

/**
 * Outil → fonctionnalité dont il tire ses données.
 *
 * QUATRE OUTILS SONT VOLONTAIREMENT ABSENTS :
 *   - `get_user_profile`, `get_realtime_data`, `query_knowledge_graph` portent le contexte
 *     de la conversation. Les couper ferait répondre Yaye à côté au lieu de refuser
 *     proprement — c'est pire qu'un refus.
 *   - `escalate_to_advisor` est un dispositif de sécurité, déclenché DE FORCE sur signal
 *     de danger, hors du choix du modèle. Le rendre masquable retirerait le recours
 *     humain à une personne en détresse.
 */
export const FLAG_PAR_OUTIL: Record<string, string> = {
  search_opportunities: 'm3.opportunites',
  get_recommendations: 'm12.reco',
  submit_application: 'm3.candidatures',
  search_events: 'm5.agenda',
  search_resources: 'm6.ressources',
  find_centres: 'm4.centres',
  get_reservable_resources: 'm4.reservations',
  reserve_resource: 'm4.reservations',
  get_badge: 'm4.carte_cjs',
  search_library: 'm4.bibliotheque',
  borrow_book: 'm4.bibliotheque',
  get_active_loans: 'm4.bibliotheque',
  get_notifications: 'x.notif_in_app',
}

/** L'outil dont les intentions sont gardées une par une. */
export const OUTIL_GRAPHE = 'query_knowledge_graph'

/**
 * Intention de `query_knowledge_graph` → fonctionnalité dont elle tire ses données.
 *
 * CET OUTIL EST UN SECOND MOTEUR DE RÉCUPÉRATION, pas un outil de contexte : chaque
 * intention rend les données d'un module, et `livre_disponible` va jusqu'à l'emplacement
 * physique de l'exemplaire (rayon · étagère · position). Il ne figure donc pas dans
 * `FLAG_PAR_OUTIL` — le masquer entier priverait Yaye de tout son raisonnement sur les
 * offres dès qu'une seule bibliothèque ferme. La garde est posée un cran plus fin.
 *
 * Chaque intention est rattachée au module dont elle SERT les données, pas à ceux qu'elle
 * traverse en chemin : `ecart_competences` rend des formations mais répond « suis-je prêt
 * pour cette offre ? », donc m3.
 */
export const FLAG_PAR_INTENTION: Record<string, string> = {
  recherche: 'm3.opportunites',
  eligibilite: 'm3.opportunites',
  parcours: 'm3.opportunites',
  apercu_marche: 'm3.opportunites',
  ecart_competences: 'm3.opportunites',
  reco_collaborative: 'm12.reco',
  ressources_competences: 'm6.ressources',
  livre_disponible: 'm4.bibliotheque',
  acteurs_programme: 'm4.centres',
}

/**
 * Intentions MASQUÉES pour cet interlocuteur.
 *
 * Refuser à l'exécution ne suffit pas : l'agent tolère les appels émis en texte brut, et le
 * modèle continuerait de tenter une intention que sa description lui présente encore. Cette
 * liste sert donc aussi à retirer l'intention de l'énumération envoyée au modèle — même
 * raisonnement qu'au niveau 2 pour les outils.
 */
export async function intentionsMasquees(
  roles: readonly string[] | null | undefined,
): Promise<Set<string>> {
  const masquees = new Set<string>()
  for (const intention of Object.keys(FLAG_PAR_INTENTION)) {
    if (await intentionMasquee(intention, roles)) masquees.add(intention)
  }
  return masquees
}

/** Vrai si cette intention du graphe doit être refusée à cet interlocuteur. */
async function intentionMasquee(
  intention: string,
  roles: readonly string[] | null | undefined,
): Promise<boolean> {
  return moduleMasque(FLAG_PAR_INTENTION[intention], roles)
}

/**
 * Vrai si cet outil doit refuser de s'exécuter pour cet interlocuteur.
 *
 * Un visiteur sans rôle est traité en anonyme : la bulle Yaye est montée sur les pages
 * publiques, l'interlocuteur n'a pas toujours de compte.
 *
 * Laisse passer si l'état est illisible — une panne ne doit pas rendre l'assistant
 * inutile, et le gate protège de toute façon les pages vers lesquelles ses cards
 * renvoient.
 */
export async function outilMasque(
  outil: string,
  roles: readonly string[] | null | undefined,
  args?: Record<string, unknown>,
): Promise<boolean> {
  // Le graphe se garde par intention, pas en bloc. Sans intention lisible on ne devine
  // pas : l'outil s'exécute et sa propre validation rejette l'intention inconnue. Masquer
  // ici reviendrait à fermer l'outil entier — ce que cette garde existe pour éviter.
  if (outil === OUTIL_GRAPHE) {
    const intention = args?.intent
    if (typeof intention !== 'string') return false
    return intentionMasquee(intention, roles)
  }

  return moduleMasque(FLAG_PAR_OUTIL[outil], roles)
}

/**
 * Cœur commun aux deux gardes : ce module est-il fermé à cet interlocuteur ?
 *
 * Laisse passer si l'état est illisible — une panne ne doit pas rendre l'assistant
 * inutile, et le gate protège de toute façon les pages vers lesquelles ses cards
 * renvoient.
 */
async function moduleMasque(
  key: string | undefined,
  roles: readonly string[] | null | undefined,
): Promise<boolean> {
  if (!key) return false

  const def = getFlagDef(key)
  if (!def) return false

  const face = resolveAudience(roles)
  if (face === 'admin') return false
  if (!def.closes.includes(face)) return false

  try {
    return (await getFlags())[key] === false
  } catch (err) {
    logger.warn('[flags] état illisible, garde Yaye laissée ouverte', { key, err: String(err) })
    return false
  }
}

/**
 * Outils MASQUÉS pour cet interlocuteur — niveau 2.
 *
 * Sert à filtrer À LA FOIS le registre, les définitions envoyées au modèle et le prompt.
 * Filtrer les seules définitions ne suffirait pas : l'agent tolère les appels émis en
 * texte brut, parsés contre les clés du registre puis exécutés — une porte qui resterait
 * ouverte sur un outil retiré.
 */
export async function outilsMasques(
  roles: readonly string[] | null | undefined,
): Promise<Set<string>> {
  const masques = new Set<string>()
  // Parcourt la table de correspondance, pas le registre : le masquage est une propriété
  // du catalogue de fonctionnalités, indépendante des outils réellement enregistrés.
  for (const outil of Object.keys(FLAG_PAR_OUTIL)) {
    if (await outilMasque(outil, roles)) masques.add(outil)
  }
  return masques
}
