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

const url = process.env.REDIS_URL ?? 'redis://localhost:6379'

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
