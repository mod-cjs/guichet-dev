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

  let current: number
  try {
    // Fenêtre FIXE et atomique :
    //   - `SET key 0 EX windowSec NX` crée le compteur avec sa TTL UNIQUEMENT au premier
    //     hit ; les hits suivants (clé déjà là) ne touchent pas la TTL → pas de fenêtre
    //     glissante involontaire (l'ancienne version réappliquait EXPIRE à chaque hit).
    //   - `INCR` compte.
    // `multi()` garantit le préfixage ACL des clés (cf. src/lib/redis.ts — à la différence
    // d'un script Lua/EVAL dont les KEYS ne seraient pas préfixés → NOPERM en prod).
    const results = await redis.multi()
      .set(key, '0', 'EX', windowSec, 'NX')
      .incr(key)
      .exec()
    // exec() renvoie [[err, val], …] : le compteur est la valeur de la 2e commande (INCR).
    // BUG CORRIGÉ : l'ancienne lecture `results?.[0]` prenait le TUPLE [err, val] et non le
    // nombre → `[null, n] > max` se coerçait en `NaN > max` = toujours false → 429 jamais émis.
    current = Number(results?.[1]?.[1] ?? 0)
    if (!Number.isFinite(current) || current === 0) return null // réponse inattendue → fail-open
  } catch {
    // Redis indisponible → fail-open : le rate-limit protège, il ne doit pas devenir un
    // point de défaillance dur qui renvoie 500 et casse tout l'endpoint (ex. le chat Yaye).
    return null
  }

  if (current > options.max) {
    return NextResponse.json(
      { error: { code: 'RATE_LIMITED', message: 'Trop de requêtes. Réessayez plus tard.' } },
      { status: 429, headers: { 'Retry-After': String(windowSec) } }
    )
  }
  return null
}
