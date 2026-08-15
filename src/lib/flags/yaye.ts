// GUIC-706 — Yaye et les modules masqués (niveau 1).
//
// L'agent expose 17 outils, dont 13 puisent dans des modules masquables. Sans garde, il
// propose spontanément des événements d'un agenda fermé — et le lien de sa card mène à un
// 404 posé par le gate.
//
// LA GARDE EST À L'EXÉCUTION, PAS AU CATALOGUE D'OUTILS. L'agent continue donc de
// connaître l'outil et peut le mentionner ; il n'obtient simplement rien, et reformule
// l'échec avec ses mots comme il le fait déjà pour toute panne d'outil.
//
// C'est un compromis assumé. Filtrer le catalogue supposerait de découper un prompt de
// 779 lignes qui nomme les outils en toutes lettres à 17 endroits, et dont le réglage est
// empirique — le code mesure 7/24 appels d'outil sous un prompt contre 23/24 sous l'autre.
// Le niveau 1 supprime la fuite de DONNÉES sans toucher à ce réglage ; il laisse la fuite
// d'EXISTENCE, Yaye pouvant nommer une fonctionnalité qu'on cache.

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
