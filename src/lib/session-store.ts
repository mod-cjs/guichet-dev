import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

const PREFIX = 'guichet:session:'
const key = (cjsUid: string) => `${PREFIX}${cjsUid}`

export async function activateSession(cjsUid: string, ttlSeconds: number): Promise<void> {
  try {
    await redis.set(key(cjsUid), '1', 'EX', Math.max(ttlSeconds, 60))
  } catch (err) {
    logger.warn('session-store: activation échouée', { cjsUid, error: String(err) })
  }
}

export async function revokeSession(cjsUid: string): Promise<void> {
  try {
    await redis.del(key(cjsUid))
  } catch (err) {
    logger.warn('session-store: révocation échouée', { cjsUid, error: String(err) })
  }
}

/** Retourne false si la session est révoquée, true sinon (fail-open si Redis est indisponible). */
export async function isSessionActive(cjsUid: string): Promise<boolean> {
  try {
    const val = await redis.get(key(cjsUid))
    return val !== null
  } catch (err) {
    logger.warn('session-store: vérification échouée — fail-open', { cjsUid, error: String(err) })
    return true
  }
}
