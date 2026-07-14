/**
 * @jest-environment node
 *
 * GUIC-566 — Cloisonnement Redis : nos clés doivent vivre sous le préfixe attribué au Guichet.
 *
 * Le Redis du serveur (`redis_cjs`, 1 Go) est MUTUALISÉ entre les plateformes CJS, avec des
 * utilisateurs ACL cloisonnés PAR PRÉFIXE DE CLÉ (`default`, `yaye`, `khady`, `guichet`, `sso`).
 * Or nos clés actuelles (`rl:*`, `llm:config`, `ia:*`, `notif:*`, `vue:*`) ne sont sous AUCUN
 * préfixe commun → Redis les REFUSERA (NOPERM). Conséquence directe : le rate-limiting de tous
 * les endpoints publics et l'idempotence des webhooks — deux protections de SÉCURITÉ — sautent.
 *
 * Ce test ne se contente pas d'un mock : il monte un VRAI utilisateur ACL cloisonné sur le Redis
 * local, démontre que l'écriture hors préfixe est refusée, puis vérifie que notre client passe.
 */
import Redis from 'ioredis'

const HOTE = process.env.REDIS_TEST_HOST ?? '127.0.0.1'
const PORT = Number(process.env.REDIS_TEST_PORT ?? 6379)
const UTILISATEUR = 'guichet_test_acl'
const MOT_DE_PASSE = 'motdepasse_test'
const PREFIXE = 'guichet:'

let admin: Redis

// Pas de `describe.skip` conditionnel : la CI fournit un service Redis, et un test d'intégration
// qui se saute en silence est un faux-vert — précisément ce que la charte qualité interdit.
// Si Redis manque, ce test échoue, et c'est le comportement voulu.
describe('GUIC-566 — cloisonnement Redis par préfixe (vrai serveur, vraie ACL)', () => {
  beforeAll(async () => {
    admin = new Redis({ host: HOTE, port: PORT })
    // Utilisateur cloisonné : toutes les commandes, mais UNIQUEMENT sur les clés `guichet:*`.
    await admin.call(
      'ACL', 'SETUSER', UTILISATEUR,
      'on', `>${MOT_DE_PASSE}`, '~' + PREFIXE + '*', '+@all',
    )
  })

  afterAll(async () => {
    if (admin) {
      await admin.call('ACL', 'DELUSER', UTILISATEUR).catch(() => {})
      await admin.del(PREFIXE + 'sonde').catch(() => {})
      admin.disconnect()
    }
  })

  it('REFUSE une écriture hors préfixe — c’est la panne qui nous attend en production', async () => {
    const client = new Redis({ host: HOTE, port: PORT, username: UTILISATEUR, password: MOT_DE_PASSE })
    // `rl:...` est exactement la clé du rate-limiting aujourd'hui.
    await expect(client.incr('rl:opportunites:1.2.3.4')).rejects.toThrow(/NOPERM/i)
    client.disconnect()
  })

  it('accepte la même écriture une fois préfixée', async () => {
    const client = new Redis({ host: HOTE, port: PORT, username: UTILISATEUR, password: MOT_DE_PASSE })
    await expect(client.incr(PREFIXE + 'rl:opportunites:1.2.3.4')).resolves.toBeGreaterThan(0)
    await client.del(PREFIXE + 'rl:opportunites:1.2.3.4')
    client.disconnect()
  })

  it('notre client préfixe automatiquement TOUTES ses clés (keyPrefix)', async () => {
    jest.resetModules()
    process.env.REDIS_URL = `redis://${UTILISATEUR}:${MOT_DE_PASSE}@${HOTE}:${PORT}`
    process.env.REDIS_KEY_PREFIX = PREFIXE

    const { redis } = await import('@/lib/redis')
    await redis.set('sonde', 'ok', 'EX', 30)

    // La clé BRUTE vue par le serveur doit porter le préfixe.
    await expect(admin.get(PREFIXE + 'sonde')).resolves.toBe('ok')
    await expect(admin.get('sonde')).resolves.toBeNull()

    redis.disconnect()
  })

  it('le rate-limiting (INCR + EXPIRE dans un multi) fonctionne sous ACL', async () => {
    jest.resetModules()
    process.env.REDIS_URL = `redis://${UTILISATEUR}:${MOT_DE_PASSE}@${HOTE}:${PORT}`
    process.env.REDIS_KEY_PREFIX = PREFIXE

    const { redis } = await import('@/lib/redis')
    // Le `multi()` doit lui aussi être préfixé — sinon le rate-limiting saute en silence.
    const res = await redis.multi().incr('rl:sonde').expire('rl:sonde', 30).exec()
    expect(res?.[0]?.[0]).toBeNull() // pas d'erreur sur l'INCR
    await expect(admin.exists(PREFIXE + 'rl:sonde')).resolves.toBe(1)

    await admin.del(PREFIXE + 'rl:sonde')
    redis.disconnect()
  })
})
