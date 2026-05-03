import { redis } from '@/lib/redis'
import { NextRequest, NextResponse } from 'next/server'

interface RateLimitOptions {
  windowMs: number  // fenêtre en millisecondes
  max: number       // requêtes max par fenêtre
  keyPrefix?: string
}

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] ?? 'unknown'
  const key = `rate_limit:${options.keyPrefix ?? 'default'}:${ip}`
  const windowSec = Math.ceil(options.windowMs / 1000)

  const current = await redis.incr(key)
  if (current === 1) await redis.expire(key, windowSec)

  if (current > options.max) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez plus tard.' } },
      { status: 429 }
    )
  }
  return null
}
