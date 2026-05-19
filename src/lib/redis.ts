import Redis from 'ioredis'

const globalForRedis = globalThis as unknown as { redis: Redis }

const url = process.env.REDIS_URL ?? 'redis://localhost:6379'

export const redis =
  globalForRedis.redis ??
  new Redis(url, {
    maxRetriesPerRequest: 1,
    lazyConnect:          true,
    connectTimeout:       5000,
    // Upstash (rediss://) exige TLS explicite avec ioredis
    tls: url.startsWith('rediss://') ? {} : undefined,
  })

if (process.env.NODE_ENV !== 'production') globalForRedis.redis = redis
