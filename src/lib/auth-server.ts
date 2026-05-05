// Node.js runtime uniquement — ne pas importer depuis middleware ou Server Components Edge
import { NextResponse } from 'next/server'
import { refreshAccessToken } from '@/lib/sso-client'
import { encodeSession, setSessionCookie } from '@/lib/auth'
import type { CJSSession } from '@/types/user'

const REFRESH_THRESHOLD_S = 300

/**
 * Si le token expire dans moins de 5 min, rafraîchit et met à jour le cookie.
 * À appeler uniquement depuis des API Routes (runtime Node.js).
 */
export async function refreshSessionIfNeeded(
  session: CJSSession,
  response: NextResponse
): Promise<CJSSession> {
  const now = Math.floor(Date.now() / 1000)
  if (session.expiresAt - now > REFRESH_THRESHOLD_S) return session

  try {
    const tokens = await refreshAccessToken(session.refreshToken)
    const updated: CJSSession = {
      ...session,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    Math.floor(Date.now() / 1000) + tokens.expires_in,
    }
    const encoded = await encodeSession(updated)
    setSessionCookie(response, encoded, tokens.expires_in)
    return updated
  } catch (err) {
    console.error('[auth-server] échec refresh token SSO — session expirée conservée:', err)
    return session
  }
}
