import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getUserInfo } from '@/lib/sso-client'
import { encodeSession, setSessionCookie } from '@/lib/auth'
import type { CJSSession } from '@/types/user'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code         = searchParams.get('code')
  const state        = searchParams.get('state')
  const storedState  = request.cookies.get('oauth_state')?.value
  const pkceVerifier = request.cookies.get('pkce_verifier')?.value

  if (!code || !state || state !== storedState || !pkceVerifier) {
    return NextResponse.redirect(new URL('/auth/connexion?error=invalid_state', request.url))
  }

  try {
    const tokens = await exchangeCode(code, pkceVerifier)
    const claims  = await getUserInfo(tokens.access_token)

    const session: CJSSession = {
      cjsUid:       claims.sub,
      nom:          claims.family_name,
      prenom:       claims.given_name,
      email:        claims.email,
      telephone:    claims.phone_number,
      region:       claims.address?.region ?? null,
      roles:        claims.cjs_roles,
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    Math.floor(Date.now() / 1000) + tokens.expires_in,
    }

    const encoded  = await encodeSession(session)
    const redirect = roleRedirect(session.roles)
    const response = NextResponse.redirect(new URL(redirect, request.url))

    setSessionCookie(response, encoded, tokens.expires_in)
    response.cookies.delete('pkce_verifier')
    response.cookies.delete('oauth_state')

    return response
  } catch {
    return NextResponse.redirect(new URL('/auth/connexion?error=auth_failed', request.url))
  }
}

function roleRedirect(roles: string[]): string {
  if (roles.includes('admin'))     return '/admin/tableau-de-bord'
  if (roles.includes('recruteur')) return '/recruteur/tableau-de-bord'
  return '/jeune/mon-profil'
}
