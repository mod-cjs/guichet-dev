// GUIC-706 — Faut-il taire les notifications d'un module ?
//
// Une notification est la surface d'incidence la plus insidieuse : elle SORT de la
// plateforme. Un jeune recevrait un WhatsApp ou un e-mail à propos d'une fonctionnalité
// devenue invisible pour lui, et cliquerait sur un lien qui répond 404.
//
// Le catalogue de notifications range ses 47 événements par module métier (m2…m12), le
// catalogue de fonctionnalités aussi : c'est ce module commun qui fait le lien, sans
// exiger de recenser à la main quel événement relève de quel flag.

import { getFlags } from '@/lib/flags'
import { logger } from '@/lib/logger'
import { FEATURE_FLAGS } from './catalog'

/**
 * Vrai si TOUTES les fonctionnalités utilisateur de ce module sont masquées.
 *
 * Le « toutes » est délibéré : un module partiellement ouvert continue de notifier. Taire
 * l'ensemble dès qu'une sous-fonctionnalité ferme priverait l'utilisateur d'informations
 * sur ce qu'il voit encore.
 */
export async function notificationMasquee(module: string): Promise<boolean> {
  const duModule = FEATURE_FLAGS.filter(
    (f) => f.module === module && !f.locked && f.closes.length > 0,
  )
  if (duModule.length === 0) return false

  try {
    const flags = await getFlags()
    return duModule.every((f) => flags[f.key] === false)
  } catch (err) {
    // Mieux vaut une notification de trop qu'un silence sur un module ouvert : le
    // destinataire attend peut-être une réponse à une candidature.
    logger.warn('[flags] état illisible, notification laissée passer', { module, err: String(err) })
    return false
  }
}
