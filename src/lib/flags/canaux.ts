// GUIC-706 — Ouverture des canaux de notification.
//
// `NOTIFICATIONS_ENABLED` était le seul kill switch réel de la plateforme : une variable
// d'environnement, tout ou rien, exigeant un redéploiement. Elle a servi — elle a permis
// de livrer avant l'approbation des gabarits Meta — mais elle ne distingue pas l'e-mail du
// SMS, ne se pilote pas depuis l'admin, et ne laisse aucune trace de qui l'a changée.
//
// ELLE N'EST PAS SUPPRIMÉE POUR AUTANT. Une variable d'environnement reste le seul levier
// qui fonctionne quand la base et Redis sont tombés — précisément le moment où l'on veut
// pouvoir tout couper. Elle devient donc un interrupteur d'URGENCE qui prime sur tout, et
// le catalogue prend le pilotage courant.

import { getFlags } from '@/lib/flags'
import { logger } from '@/lib/logger'
import { getFlagDef } from './catalog'

export type CanalId = 'in_app' | 'email' | 'sms' | 'whatsapp'

/** Canal → fonctionnalité du catalogue. */
const FLAG_PAR_CANAL: Record<string, string> = {
  in_app: 'x.notif_in_app',
  email: 'x.notif_email',
  sms: 'x.notif_sms',
  whatsapp: 'x.notif_whatsapp',
}

/**
 * Canaux couverts par l'interrupteur d'urgence.
 *
 * L'in-app en est exclu, comme il l'a toujours été : la variable ne gardait que les canaux
 * à coût externe. L'y ajouter rendrait la plateforme muette sur des événements critiques —
 * statut de candidature, convocation à un entretien.
 */
const SOUS_INTERRUPTEUR: readonly string[] = ['email', 'sms', 'whatsapp']

/**
 * Vrai si ce canal peut émettre.
 *
 * Deux défauts OUVERTS, et c'est délibéré : un canal absent du catalogue reste ouvert, et
 * un état illisible laisse passer. Le défaut fermé est bon pour un ACCÈS — il protège une
 * ressource — mais mauvais pour une INFORMATION DUE : mieux vaut une notification de trop
 * qu'un silence sur une réponse attendue.
 */
export async function canalOuvert(canal: CanalId): Promise<boolean> {
  // L'interrupteur d'urgence prime, y compris sur un flag ouvert et y compris quand tout
  // le reste est tombé — c'est exactement le cas pour lequel il existe.
  if (SOUS_INTERRUPTEUR.includes(canal) && process.env.NOTIFICATIONS_ENABLED !== 'true') {
    return false
  }

  const key = FLAG_PAR_CANAL[canal]
  if (!key || !getFlagDef(key)) return true

  try {
    return (await getFlags())[key] !== false
  } catch (err) {
    logger.warn('[flags] état illisible, canal laissé ouvert', { canal, err: String(err) })
    return true
  }
}
