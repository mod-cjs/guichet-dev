import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

const PREFIX   = 'guichet:session:revoked:'
const key      = (cjsUid: string) => `${PREFIX}${cjsUid}`
const REVOKED  = 'revoked'
const TTL_7D   = 7 * 24 * 3600

/**
 * Logique denylist : une session est active par défaut (le JWT fait foi).
 * Redis ne stocke que les sessions explicitement révoquées (backchannel logout).
 * Élimine la race condition multi-région Vercel (cdg1 écrit, lhr1 lit immédiatement).
 */

/** No-op — la session est active dès que le cookie JWT est posé. */
export async function activateSession(_cjsUid: string, _ttlSeconds: number): Promise<void> {
  // Denylist : aucune écriture Redis au login, le JWT est la source de vérité
}

/** Marque la session comme révoquée dans Redis (TTL 7 jours). */
export async function revokeSession(cjsUid: string): Promise<void> {
  try {
    await redis.set(key(cjsUid), REVOKED, 'EX', TTL_7D)
  } catch (err) {
    logger.warn('session-store: révocation échouée', { cjsUid, error: String(err) })
  }
}

/** Retourne false uniquement si la session est explicitement révoquée dans Redis. */
export async function isSessionActive(cjsUid: string): Promise<boolean> {
  try {
    const val = await redis.get(key(cjsUid))
    return val !== REVOKED
  } catch (err) {
    logger.warn('session-store: vérification échouée — fail-open', { cjsUid, error: String(err) })
    return true
  }
}
