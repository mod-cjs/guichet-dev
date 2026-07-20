// GUIC-566 — Client Redis cloisonné.
//
// En production, Redis (`redis_cjs`, 1 Go) est MUTUALISÉ entre les plateformes CJS. Chaque
// plateforme a un utilisateur ACL qui ne lui donne accès QU'À SON PRÉFIXE DE CLÉ : une commande
// portant sur une clé hors préfixe est rejetée par le serveur (`NOPERM`).
//
// On ne préfixe donc PAS clé par clé — on en oublierait, et l'oubli resterait silencieux jusqu'à
// la production. `keyPrefix` d'ioredis préfixe TOUTES les commandes du client, y compris celles
// d'un `multi()` (ce dont dépend le rate-limiting). Les appelants continuent d'écrire `rl:...`,
// `llm:config` ou `ia:<uid>` sans rien savoir du cloisonnement.
//
// L'utilisateur ACL et son mot de passe voyagent dans `REDIS_URL` :
//     redis://guichet:<motdepasse>@127.0.0.1:6379

import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis }

/** Sous-ensemble d'environnement lu ici (injectable → testable). */
export type EnvRedis = {
  REDIS_URL?:      string
  REDIS_HOST?:     string
  REDIS_PORT?:     string
  REDIS_USERNAME?: string
  REDIS_PASSWORD?: string
  NODE_ENV?:       string
  [autre: string]: string | undefined
}

/**
 * GUIC-623 — URL de connexion, tolérante aux DEUX conventions.
 *
 * L'infra CJS fournit les paramètres en variables DISCRÈTES (`REDIS_HOST`, `REDIS_PORT`,
 * `REDIS_USERNAME`, `REDIS_PASSWORD`) ; ce module ne lisait que `REDIS_URL` et retombait
 * SILENCIEUSEMENT sur `redis://localhost:6379`. En production ce repli désigne le conteneur
 * lui-même, où rien n'écoute : `rate-limit.ts` n'ayant aucun `try/catch`, l'exception remonte
 * et TOUS les endpoints publics répondent 500.
 *
 * Même classe de bug que GUIC-565 (nommage des clés S3). `REDIS_URL` reste prioritaire : la CI,
 * les e2e et le compose local continuent de fonctionner à l'identique.
 *
 * Sûr par défaut : en production, sans aucune des deux formes, on LÈVE au démarrage plutôt que
 * de servir avec un Redis mort (même principe que `src/lib/security/prod-guards.ts`).
 */
export function resolveRedisUrl(env: EnvRedis): string {
  if (env.REDIS_URL) return env.REDIS_URL

  const host = env.REDIS_HOST
  if (host) {
    const port = env.REDIS_PORT ?? '6379'
    // Le mot de passe ACL peut contenir « @ », « : » ou « / » : sans encodage, l'URL est
    // découpée au mauvais endroit et le client vise un autre hôte.
    const user = env.REDIS_USERNAME ? encodeURIComponent(env.REDIS_USERNAME) : ''
    const pass = env.REDIS_PASSWORD ? encodeURIComponent(env.REDIS_PASSWORD) : ''
    const auth = user || pass ? `${user}:${pass}@` : ''
    return `redis://${auth}${host}:${port}`
  }

  if (env.NODE_ENV === 'production') {
    throw new Error(
      'Configuration Redis absente : renseigner REDIS_URL, ou REDIS_HOST (+ REDIS_PORT, ' +
        'REDIS_USERNAME, REDIS_PASSWORD). Refus de démarrer avec le repli localhost, qui ' +
        'désignerait le conteneur lui-même et ferait répondre 500 à tous les endpoints publics.',
    )
  }
  return 'redis://localhost:6379'
}

const url = resolveRedisUrl(process.env)

/**
 * Préfixe appliqué à toutes nos clés. Doit correspondre au périmètre accordé à notre utilisateur
 * ACL côté serveur (`~guichet:*`). Surchargeable par l'environnement si le lead attribue un autre
 * préfixe — sans toucher au code.
 */
const keyPrefix = process.env.REDIS_KEY_PREFIX ?? 'guichet:'

export const redis =
  globalForRedis.redis ??
  new Redis(url, {
    keyPrefix,
    maxRetriesPerRequest: 1,
    lazyConnect:          true,
    connectTimeout:       5000,
    // Upstash (rediss://) exige TLS explicite avec ioredis
    tls: url.startsWith('rediss://') ? {} : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
