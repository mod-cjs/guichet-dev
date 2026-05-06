import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/sso-client'

export async function GET(request: NextRequest) {
  // Après un logout explicite, forcer la saisie des credentials SSO
  // même si une session SSO est encore active (protection appareils partagés).
  const forceLogin = request.cookies.get('force_login')?.value === '1'

  const { url, state, pkceVerifier } = await getAuthorizationUrl(undefined, forceLogin)

  const secure   = process.env.NODE_ENV === 'production'
  const response = NextResponse.redirect(url)

  response.cookies.set('pkce_verifier', pkceVerifier, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge:   300,
    path:     '/',
  })
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    maxAge:   300,
    path:     '/',
  })

  // Consommer le flag — une seule utilisation
  response.cookies.delete('force_login')

  return response
}
