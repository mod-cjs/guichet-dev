// Contexte conversationnel de Yaye — cache Redis (fail-soft).
// Spec : .agent_context/specs/yaye/07-securite-conformite.md §Redis (contexte + cjs_uid
// uniquement, aucune donnée sensible) · décision 6 (Redis = cache chaud).
//
// Clé = identité de l'utilisateur (`user:<cjsUid>`) → la mémoire conversationnelle
// SUIT la personne d'un canal à l'autre (web ↔ WhatsApp) : continuité cross-canal.
// Le `cjs_uid` étant le seul identifiant inter-plateformes (CLAUDE.md), c'est aussi
// l'ancrage le plus aligné avec le droit à l'oubli (une clé à purger par personne).
// TTL unifié 7 jours : Yaye se souvient d'une session à l'autre, sur tous les canaux.
//
// ⚠️ STOCKAGE EN LISTE (GUIC-678) : l'historique était une CHAÎNE JSON lue au début de
// la requête et réécrite à la fin. Deux messages simultanés de la même personne (deux
// onglets, ou web + WhatsApp) faisaient perdre un tour : le second écrasait le premier.
// Chaque tour est désormais AJOUTÉ atomiquement (RPUSH) puis la liste est bornée (LTRIM).

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

/** Une clé au FORMAT PRÉCÉDENT (chaîne JSON) répond WRONGTYPE aux commandes de liste. */
function isWrongType(err: unknown): boolean {
  return /WRONGTYPE/i.test(err instanceof Error ? err.message : String(err))
}

function parseTurn(raw: string): ChatTurn[] {
  try {
    const t = JSON.parse(raw) as ChatTurn
    return t && (t.role === 'user' || t.role === 'assistant') && typeof t.content === 'string' ? [t] : []
  } catch {
    return []
  }
}

/**
 * Charge l'historique d'une conversation. Jamais d'exception (retourne [] en cas d'échec).
 * Une clé au format précédent (chaîne JSON) est effacée à la volée : la conversation
 * repart de zéro une seule fois, plutôt que d'échouer à chaque tour.
 */
export async function loadContext(key: string): Promise<ChatTurn[]> {
  const k = PREFIX + key
  try {
    const raws = await redis.lrange(k, -MAX_TURNS, -1)
    return raws.flatMap(parseTurn)
  } catch (err) {
    if (isWrongType(err)) {
      logger.warn('[yaye-context] clé au format précédent → migration par purge', { key })
      try {
        await redis.del(k)
      } catch { /* best-effort */ }
      return []
    }
    logger.warn('[yaye-context] load échec', { err: String(err) })
    return []
  }
}

/**
 * AJOUTE des tours à l'historique, de façon atomique (RPUSH) puis borne la liste.
 * C'est la seule écriture du chemin conversationnel : deux requêtes concurrentes
 * s'entrelacent sans se perdre. Fail-soft.
 */
export async function appendTurns(key: string, turns: ChatTurn[], ttl: number): Promise<void> {
  if (turns.length === 0) return
  const k = PREFIX + key
  const payload = turns.map(t => JSON.stringify(t))
  try {
    await redis.rpush(k, ...payload)
  } catch (err) {
    if (!isWrongType(err)) {
      logger.warn('[yaye-context] append échec', { err: String(err) })
      return
    }
    // Clé au format précédent : on la remplace par une liste, une seule fois.
    try {
      await redis.del(k)
      await redis.rpush(k, ...payload)
    } catch (err2) {
      logger.warn('[yaye-context] append échec après migration', { err: String(err2) })
      return
    }
  }
  try {
    await redis.ltrim(k, -MAX_TURNS, -1)
    await redis.expire(k, ttl)
  } catch (err) {
    logger.warn('[yaye-context] bornage/TTL échec', { err: String(err) })
  }
}

/**
 * REMPLACE l'historique (réécriture complète). Réservé aux cas où l'on reconstruit
 * délibérément la conversation ; le chemin normal est `appendTurns`, qui ne peut pas
 * perdre le tour d'une requête concurrente.
 */
export async function saveContext(key: string, turns: ChatTurn[], ttl: number): Promise<void> {
  const k = PREFIX + key
  const derniers = turns.slice(-MAX_TURNS)
  try {
    await redis.del(k)
    if (derniers.length > 0) {
      await redis.rpush(k, ...derniers.map(t => JSON.stringify(t)))
      await redis.expire(k, ttl)
    }
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
