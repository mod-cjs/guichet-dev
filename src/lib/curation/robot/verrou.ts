import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'

/**
 * GUIC-597/598 — Verrou Redis anti-réentrance de la veille. Couvre découverte (phase 1)
 * ET extraction (phase 2) d'un même tick cron, pour qu'un run concurrent ne double-fetch
 * pas les mêmes sources/items externes. Fail-open si Redis indisponible (on ne bloque pas
 * la veille), avec avertissement.
 */

const CLE = 'curation:veille:lock'
const TTL_S = 290 // < maxDuration (300 s)

/**
 * Exécute `fn` sous verrou exclusif. Renvoie `{ ignore: true }` sans exécuter si un run
 * est déjà en cours. Si Redis est indisponible, exécute quand même (fail-open).
 */
export async function avecVerrouVeille<T>(fn: () => Promise<T>): Promise<T | { ignore: true }> {
  let acquis = false
  try {
    acquis = (await redis.set(CLE, String(Date.now()), 'EX', TTL_S, 'NX')) === 'OK'
    if (!acquis) {
      logger.info('curation.veille.deja_en_cours')
      return { ignore: true }
    }
  } catch (e) {
    logger.warn('curation.veille.verrou_indispo', {
      error: e instanceof Error ? e.message : String(e),
    })
  }
  try {
    return await fn()
  } finally {
    if (acquis) await redis.del(CLE).catch(() => {})
  }
}
