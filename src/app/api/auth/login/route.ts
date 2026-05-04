import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/sso-client'

export async function GET(request: NextRequest) {
  const { url, state, pkceVerifier } = getAuthorizationUrl()

  const response = NextResponse.redirect(url)
  response.cookies.set('pkce_verifier', pkceVerifier, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   300,
    path:     '/',
  })
  response.cookies.set('oauth_state', state, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge:   300,
    path:     '/',
  })
  return response
}
