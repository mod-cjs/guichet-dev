// Contexte conversationnel de Yaye — cache Redis (fail-soft).
// Spec : .agent_context/specs/yaye/07-securite-conformite.md §Redis (contexte + cjs_uid
// uniquement, aucune donnée sensible) · décision 6 (Redis = cache chaud).
//
// Clé = identifiant de session (web : sessionId ; WhatsApp : `wa:<E164>`).
// TTL : 30 min côté web, 7 jours côté WhatsApp.

import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

const PREFIX = 'yaye:ctx:'
const MAX_TURNS = 20 // on borne l'historique (coût/latence)

export const TTL_WEB = 30 * 60 // 30 min
export const TTL_WHATSAPP = 7 * 24 * 3600 // 7 jours

/** Charge l'historique d'une conversation. Jamais d'exception (retourne [] en cas d'échec). */
export async function loadContext(key: string): Promise<ChatTurn[]> {
  try {
    const raw = await redis.get(PREFIX + key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as ChatTurn[]).slice(-MAX_TURNS) : []
  } catch (err) {
    logger.warn('[yaye-context] load échec', { err: String(err) })
    return []
  }
}

/** Persiste l'historique (tronqué) avec TTL. Fail-soft. */
export async function saveContext(key: string, turns: ChatTurn[], ttl: number): Promise<void> {
  try {
    await redis.set(PREFIX + key, JSON.stringify(turns.slice(-MAX_TURNS)), 'EX', ttl)
  } catch (err) {
    logger.warn('[yaye-context] save échec', { err: String(err) })
  }
}
