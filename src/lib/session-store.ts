import { redis } from '@/lib/redis'
import { logger, hashId } from '@/lib/logger'

const PREFIX   = 'guichet:session:revoked:'
const key      = (cjsUid: string) => `${PREFIX}${cjsUid}`
const REVOKED  = 'revoked'
const TTL_7D   = 7 * 24 * 3600

// Denylist : une session est active par défaut (le JWT fait foi).
// Redis ne stocke que les sessions explicitement révoquées (backchannel logout).

/** No-op — la session est active dès que le cookie JWT est posé. */
export async function activateSession(_cjsUid: string, _ttlSeconds: number): Promise<void> {}

/** Marque la session comme révoquée dans Redis (TTL 7 jours). */
export async function revokeSession(cjsUid: string): Promise<void> {
  try {
    await redis.set(key(cjsUid), REVOKED, 'EX', TTL_7D)
  } catch (err) {
    logger.warn('session-store: révocation échouée', { cjsUidHash: hashId(cjsUid), error: String(err) })
  }
}

/**
 * Retire le flag de révocation Redis. À appeler lors d'une nouvelle authentification
 * réussie (callback SSO) : le user vient de prouver son identité au SSO, sa session
 * précédente ne doit plus le bloquer.
 *
 * Sans ça, un user qui se déconnecte est verrouillé hors de la plateforme pendant
 * 7 jours (TTL de la denylist) — cf bug GUIC-166 boucle login.
 */
export async function clearRevocation(cjsUid: string): Promise<void> {
  try {
    await redis.del(key(cjsUid))
  } catch (err) {
    logger.warn('session-store: clear revocation échouée', { cjsUidHash: hashId(cjsUid), error: String(err) })
  }
}

/** Retourne false uniquement si la session est explicitement révoquée dans Redis. */
export async function isSessionActive(cjsUid: string): Promise<boolean> {
  try {
    const val = await redis.get(key(cjsUid))
    return val !== REVOKED
  } catch (err) {
    logger.warn('session-store: vérification échouée — fail-open', { cjsUidHash: hashId(cjsUid), error: String(err) })
    return true
  }
}
