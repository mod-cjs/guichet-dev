import { redis } from '@/lib/redis'
import { NextRequest, NextResponse } from 'next/server'

interface RateLimitOptions {
  windowMs: number
  max: number
  keyPrefix?: string
  /**
   * Si `true`, la clé Redis n'inclut PAS l'IP — la clé `keyPrefix` doit alors
   * déjà inclure le `cjsUid` (endpoint authentifié). Évite que plusieurs
   * jeunes derrière le même NAT/portail captif s'éjectent mutuellement.
   * Cf GUIC-218 (audit CDP / Wave 6).
   */
  authenticated?: boolean
}

export function extractIp(request: NextRequest): string {
  // x-real-ip est injecté par Nginx/OVH et ne peut pas être forgé par le client
  const realIp = request.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  // x-forwarded-for : prendre la première IP uniquement si derrière proxy de confiance
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0].trim()
    if (first) return first
  }

  return 'no-ip'
}

export async function rateLimit(
  request: NextRequest,
  options: RateLimitOptions
): Promise<NextResponse | null> {
  const prefix = options.keyPrefix ?? 'default'
  const key = options.authenticated
    ? `rl:${prefix}`
    : `rl:${prefix}:${extractIp(request)}`
  const windowSec = Math.ceil(options.windowMs / 1000)

  // INCR + EXPIRE atomique pour éviter la race condition
  const results = await redis.multi()
    .incr(key)
    .expire(key, windowSec)
    .exec()
  const current = (results?.[0] as unknown as number) ?? 1

  if (current > options.max) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez plus tard.' } },
      { status: 429, headers: { 'Retry-After': String(windowSec) } }
    )
  }
  return null
}
