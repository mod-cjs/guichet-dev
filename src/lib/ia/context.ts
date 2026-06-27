// Contexte conversationnel de Yaye — cache Redis (fail-soft).
// Spec : .agent_context/specs/yaye/07-securite-conformite.md §Redis (contexte + cjs_uid
// uniquement, aucune donnée sensible) · décision 6 (Redis = cache chaud).
//
// Clé = identité de l'utilisateur (`user:<cjsUid>`) → la mémoire conversationnelle
// SUIT la personne d'un canal à l'autre (web ↔ WhatsApp) : continuité cross-canal.
// Le `cjs_uid` étant le seul identifiant inter-plateformes (CLAUDE.md), c'est aussi
// l'ancrage le plus aligné avec le droit à l'oubli (une clé à purger par personne).
// TTL unifié 7 jours : Yaye se souvient d'une session à l'autre, sur tous les canaux.

import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

const PREFIX = 'yaye:ctx:'
const MAX_TURNS = 20 // on borne l'historique (coût/latence)

export const TTL_WEB = 30 * 60 // 30 min (conservé pour compat — non utilisé par la clé user)
export const TTL_WHATSAPP = 7 * 24 * 3600 // 7 jours
/** TTL de la mémoire unifiée par utilisateur (continuité cross-canal). */
export const TTL_USER = 7 * 24 * 3600 // 7 jours

/**
 * Clé de contexte unifiée par utilisateur. La conversation Yaye d'une personne est
 * la MÊME quel que soit le canal (web ou WhatsApp) → on bascule de l'un à l'autre
 * sans repartir de zéro. `cjsUid` est le seul identifiant inter-plateformes.
 */
export function userContextKey(cjsUid: string): string {
  return `user:${cjsUid}`
}

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

/** Efface la mémoire conversationnelle d'un utilisateur (droit à l'oubli CDP). Fail-soft. */
export async function purgeUserContext(cjsUid: string): Promise<void> {
  try {
    await redis.del(PREFIX + userContextKey(cjsUid))
  } catch (err) {
    logger.warn('[yaye-context] purge échec', { err: String(err) })
  }
}
