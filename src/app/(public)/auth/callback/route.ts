import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getUserInfo, revokeToken, type TokenResponse } from '@/lib/sso-client'
import { encodeSession, setSessionCookie } from '@/lib/auth'
import { logger } from '@/lib/logger'
import type { CJSSession } from '@/types/user'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code         = searchParams.get('code')
  const state        = searchParams.get('state')
  const storedState  = request.cookies.get('oauth_state')?.value
  const pkceVerifier = request.cookies.get('pkce_verifier')?.value
  const returnTo     = request.cookies.get('auth_return_to')?.value

  if (!code || !state || state !== storedState || !pkceVerifier) {
    return NextResponse.redirect(new URL('/auth/connexion?error=invalid_state', request.url))
  }

  let tokens: TokenResponse | undefined
  try {
    tokens = await exchangeCode(code, pkceVerifier)
    const claims = await getUserInfo(tokens.access_token)

    const roles = Array.isArray(claims.cjs_roles)
      ? claims.cjs_roles
      : String(claims.cjs_roles).split(',').map(r => r.trim()).filter(Boolean)

    // Compte sans rôle reconnu → accès refusé avec message explicite
    if (roles.length === 0) {
      await revokeToken(tokens.access_token).catch(() => {})
      return NextResponse.redirect(new URL('/auth/connexion?error=no_role', request.url))
    }

    const session: CJSSession = {
      cjsUid:       claims.sub,
      nom:          claims.family_name,
      prenom:       claims.given_name,
      email:        claims.email,
      telephone:    claims.phone_number,
      region:       claims.address?.region ?? null,
      roles,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    Math.floor(Date.now() / 1000) + tokens.expires_in,
    }

    const encoded      = await encodeSession(session)
    const destination  = safeReturnTo(returnTo) ?? roleRedirect(session.roles)
    const response     = NextResponse.redirect(new URL(destination, request.url))

    setSessionCookie(response, encoded, tokens.expires_in)
    response.cookies.delete('pkce_verifier')
    response.cookies.delete('oauth_state')
    response.cookies.delete('auth_return_to')

    return response
  } catch (err) {
    if (tokens?.access_token) {
      await revokeToken(tokens.access_token).catch(() => {})
    }
    logger.error('auth/callback: échec authentification SSO', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.redirect(new URL('/auth/connexion?error=auth_failed', request.url))
  }
}

function roleRedirect(roles: string[]): string {
  if (roles.includes('admin'))        return '/admin/tableau-de-bord'
  if (roles.includes('recruteur'))    return '/recruteur/tableau-de-bord'
  if (roles.includes('beneficiaire')) return '/jeune/mon-profil'
  return '/auth/connexion?error=no_role'
}

function safeReturnTo(url: string | undefined): string | null {
  if (!url) return null
  try {
    // Accepter uniquement les chemins relatifs (pas de redirections open)
    const parsed = new URL(url, 'http://localhost')
    if (parsed.origin !== 'http://localhost') return null
    return parsed.pathname + parsed.search
  } catch {
    return null
  }
}
