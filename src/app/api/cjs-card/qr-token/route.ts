import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { SignJWT } from 'jose'
import { getSession } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'
import { getCJSCardSecret } from '@/lib/auth/cjs-card-secret'
import type { ApiResponse } from '@/types/api'

/**
 * GET /api/cjs-card/qr-token — JWT HS256 rotatif (TTL 15 min) pour la carte CJS.
 *
 * Spec : `.agent_context/specs/M4-centres-lot7.md` §5 Wave 6 / GUIC-386.
 * Architecture : `.agent_context/adr/ADR-002-qr-jwt-rotatif.md`.
 *
 * Le token est présenté côté scanner staff (Wave 6.2). Il contient :
 *   - `sub`   : cjsUid du porteur
 *   - `nonce` : UUID anti-replay (Redis SET NX côté scanner W6.2)
 *   - `iat`/`exp` : émission + expiration unix
 *   - `scope` : "checkin" (limite l'usage)
 *
 * **Sécurité** — `JWT_CJS_CARD_SECRET` (32 bytes hex) doit être configurée
 * sur Vercel mouhammadouod (preview + prod). Fallback dev : random au boot
 * + warning logué (les tokens ne survivent pas à un redémarrage serveur,
 * acceptable en local).
 *
 * Rate-limit : 30/min/cjsUid — refresh fréquent toléré (auto-refresh client
 * à 14 min mais l'utilisateur peut aussi forcer un refresh).
 */

const ALG = 'HS256'
const TTL_SECONDS = 60 * 15 // 15 min
const REFRESH_BEFORE_EXP_SECONDS = 60 // 1 min avant exp

export async function GET(request: NextRequest) {
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json<ApiResponse<never>>(
      { error: { code: 'UNAUTHORIZED', message: 'Authentification requise.' } },
      { status: 401 },
    )
  }

  // Rate-limit authentifié — clé inclut le cjsUid.
  const limited = await rateLimit(request, {
    windowMs: 60_000,
    max: 30,
    keyPrefix: `cjs-card-qr:${session.cjsUid}`,
    authenticated: true,
  })
  if (limited) return limited

  const nowSec = Math.floor(Date.now() / 1000)
  const expSec = nowSec + TTL_SECONDS
  const refreshSec = expSec - REFRESH_BEFORE_EXP_SECONDS
  const nonce = crypto.randomUUID()

  let token: string
  try {
    token = await new SignJWT({ scope: 'checkin', nonce })
      .setProtectedHeader({ alg: ALG, kid: 'cjs-checkin-v1' })
      .setSubject(session.cjsUid)
      .setIssuedAt(nowSec)
      .setExpirationTime(expSec)
      .sign(getCJSCardSecret())
  } catch (err) {
    logger.error('[cjs-card/qr-token] signature JWT échouée', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json<ApiResponse<never>>(
      { error: { code: 'TOKEN_SIGN_FAILED', message: 'Génération du QR impossible.' } },
      { status: 500 },
    )
  }

  return NextResponse.json<
    ApiResponse<{ token: string; expiresAt: string; refreshAt: string }>
  >({
    data: {
      token,
      expiresAt: new Date(expSec * 1000).toISOString(),
      refreshAt: new Date(refreshSec * 1000).toISOString(),
    },
  })
}
