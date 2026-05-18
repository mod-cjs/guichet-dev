import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import { revokeSession } from '@/lib/session-store'
import { rateLimit } from '@/lib/rate-limit'
import { logger } from '@/lib/logger'

const JWKS_URL   = `${process.env.SSO_BASE_URL}/oauth/keys`
const SSO_ISSUER = process.env.SSO_BASE_URL ?? ''

// Cache JWKS pour éviter une requête par logout
let jwks: ReturnType<typeof createRemoteJWKSet> | null = null
function getJwks() {
  if (!jwks) jwks = createRemoteJWKSet(new URL(JWKS_URL))
  return jwks
}

export async function POST(request: NextRequest) {
  const limited = await rateLimit(request, { windowMs: 60_000, max: 20, keyPrefix: 'backchannel-logout' })
  if (limited) return limited

  const body = await request.text()
  const params = new URLSearchParams(body)
  const logoutToken = params.get('logout_token')

  if (!logoutToken) {
    return NextResponse.json({ error: 'missing logout_token' }, { status: 400 })
  }

  try {
    const { payload } = await jwtVerify(logoutToken, getJwks(), {
      issuer:   SSO_ISSUER,
      audience: process.env.SSO_CLIENT_ID,
    })

    if (payload['nonce'] !== undefined) {
      return NextResponse.json({ error: 'nonce interdit dans un logout token' }, { status: 400 })
    }
    if (!payload['events'] || !(payload['events'] as Record<string, unknown>)['http://schemas.openid.net/event/backchannel-logout']) {
      return NextResponse.json({ error: 'événement backchannel-logout absent' }, { status: 400 })
    }

    const sub = payload.sub as string | undefined
    if (!sub) {
      return NextResponse.json({ error: 'sub manquant' }, { status: 400 })
    }

    await revokeSession(sub)
    logger.info('backchannel-logout: session révoquée', { sub })

    return new NextResponse(null, { status: 200 })
  } catch (err) {
    logger.warn('backchannel-logout: token invalide', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.json({ error: 'logout_token invalide' }, { status: 400 })
  }
}
