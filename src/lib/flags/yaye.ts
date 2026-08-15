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
): Promise<boolean> {
  const key = FLAG_PAR_OUTIL[outil]
  if (!key) return false

  const def = getFlagDef(key)
  if (!def) return false

  const face = resolveAudience(roles)
  if (face === 'admin') return false
  if (!def.closes.includes(face)) return false

  try {
    return (await getFlags())[key] === false
  } catch (err) {
    logger.warn('[flags] état illisible, outil Yaye laissé actif', { outil, err: String(err) })
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
