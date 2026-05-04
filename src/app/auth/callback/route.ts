import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getUserInfo } from '@/lib/sso-client'
import type { CJSSession } from '@/types/user'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')
  const storedState    = request.cookies.get('oauth_state')?.value
  const codeVerifier   = request.cookies.get('pkce_verifier')?.value

  if (!code || state !== storedState || !codeVerifier) {
    return NextResponse.redirect(new URL('/auth/connexion?error=invalid_state', request.url))
  }

  try {
    const tokens = await exchangeCode(code, codeVerifier)
    const claims = await getUserInfo(tokens.access_token)

    const session: CJSSession = {
      cjsUid:      claims.sub,
      nom:         claims.family_name,
      prenom:      claims.given_name,
      email:       claims.email,
      telephone:   claims.phone_number,
      region:      claims.address?.region ?? null,
      roles:       claims.cjs_roles,
      accessToken: tokens.access_token,
      expiresAt:   Math.floor(Date.now() / 1000) + tokens.expires_in,
    }

    const sessionEncoded = Buffer.from(JSON.stringify(session)).toString('base64')
    const response = NextResponse.redirect(new URL('/mon-profil', request.url))
    response.cookies.set('cjs_session', sessionEncoded, {
      httpOnly: true, secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', maxAge: tokens.expires_in,
    })
    response.cookies.delete('pkce_verifier')
    response.cookies.delete('oauth_state')
    return response
  } catch {
    return NextResponse.redirect(new URL('/auth/connexion?error=auth_failed', request.url))
  }
}
