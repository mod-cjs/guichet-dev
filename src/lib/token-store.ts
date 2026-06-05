import { redis } from '@/lib/redis'
import { logger, hashId } from '@/lib/logger'

/**
 * Store Redis pour les tokens SSO (access + refresh).
 *
 * Objectif (GUIC-166) : sortir les tokens du cookie de session pour le rendre
 * léger (~400 bytes au lieu de ~3000). Les tokens, beaucoup plus longs et
 * réécrits à chaque refresh, vivent désormais côté serveur.
 *
 * Clé Redis : `guichet:tokens:{cjsUid}` (string JSON)
 * TTL aligné sur la durée du refresh token (par défaut 30 jours).
 */

const PREFIX = 'guichet:tokens:'
const key    = (cjsUid: string) => `${PREFIX}${cjsUid}`
const TTL_30D = 30 * 24 * 3600

export interface StoredTokens {
  accessToken:  string
  refreshToken: string
  expiresAt:    number      // epoch seconds
}

export async function saveTokens(cjsUid: string, tokens: StoredTokens, ttlSeconds: number = TTL_30D): Promise<void> {
  try {
    await redis.set(key(cjsUid), JSON.stringify(tokens), 'EX', Math.max(60, ttlSeconds))
  } catch (err) {
    logger.warn('token-store: save échec', { cjsUidHash: hashId(cjsUid), error: String(err) })
    throw err
  }
}

export async function getTokens(cjsUid: string): Promise<StoredTokens | null> {
  try {
    const raw = await redis.get(key(cjsUid))
    if (!raw) return null
    return JSON.parse(raw) as StoredTokens
  } catch (err) {
    logger.warn('token-store: get échec', { cjsUidHash: hashId(cjsUid), error: String(err) })
    return null
  }
}

export async function clearTokens(cjsUid: string): Promise<void> {
  try {
    await redis.del(key(cjsUid))
  } catch (err) {
    logger.warn('token-store: clear échec', { cjsUidHash: hashId(cjsUid), error: String(err) })
  }
}
