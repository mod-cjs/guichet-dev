// Session conversationnelle WhatsApp (GUIC-678).
//
// Problème : le `sessionId` WhatsApp était l'id de la `ConversationWhatsApp` — donc
// ÉTERNEL. Deux conséquences mesurables :
//   1. l'anti-doublon d'escalade cherche `sessionId + statut ≠ resolue` : tant qu'une
//      escalade reste ouverte, un problème SANS RAPPORT ne créait plus jamais d'entrée
//      dans la file — le second signalement disparaissait silencieusement ;
//   2. tous les logs d'un usager WhatsApp s'agrégeaient dans une session unique, ce qui
//      fausse toutes les métriques par session (durée, tours, taux d'abandon).
//
// Une session = une plage de conversation. On la fait rouler après un délai d'INACTIVITÉ,
// comme le ferait un onglet web qu'on rouvre le lendemain. La mémoire conversationnelle,
// elle, ne bouge pas : elle est portée par le `cjs_uid` (context.ts), pas par la session.
//
// Fail-soft : si Redis est indisponible, on retombe sur l'id de conversation — le
// comportement d'avant, jamais une erreur.

import { randomUUID } from 'node:crypto'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { numEnv } from './env'

const PREFIX = 'yaye:wa:session:'
/** Inactivité au-delà de laquelle un nouveau message ouvre une nouvelle session. */
export const WA_SESSION_IDLE_S = numEnv('YAYE_WA_SESSION_IDLE_S', 24 * 3600)

export function waSessionKey(conversationId: string): string {
  return `${PREFIX}${conversationId}`
}

/**
 * Renvoie la session courante de cette conversation, ou en ouvre une nouvelle après
 * la fenêtre d'inactivité. Le TTL est rafraîchi à chaque message (fenêtre glissante).
 */
export async function resolveWhatsAppSessionId(conversationId: string): Promise<string> {
  const key = waSessionKey(conversationId)
  try {
    const existing = await redis.get(key)
    if (existing) {
      await redis.expire(key, WA_SESSION_IDLE_S)
      return existing
    }
    const fresh = randomUUID()
    await redis.set(key, fresh, 'EX', WA_SESSION_IDLE_S)
    return fresh
  } catch (err) {
    logger.warn('[whatsapp-session] Redis indisponible → repli sur l’id de conversation', { err: String(err) })
    return conversationId
  }
}
