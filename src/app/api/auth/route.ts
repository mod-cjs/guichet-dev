import { NextRequest, NextResponse } from 'next/server'
import { buildAuthorizeUrl } from '@/lib/sso-client'
import { randomBytes, createHash } from 'crypto'

// /api/auth/login — génère le PKCE et redirige vers le SSO
export async function GET(request: NextRequest) {
  const action = new URL(request.url).searchParams.get('action')

  if (action === 'logout') {
    const response = NextResponse.redirect(new URL('/', request.url))
    response.cookies.delete('cjs_session')
    return response
  }

  // Génération PKCE
  const codeVerifier  = randomBytes(32).toString('base64url')
  const codeChallenge = createHash('sha256').update(codeVerifier).digest('base64url')
  const state         = randomBytes(16).toString('hex')

  const authorizeUrl = buildAuthorizeUrl(codeChallenge, state)

  const response = NextResponse.redirect(authorizeUrl)
  response.cookies.set('pkce_verifier', codeVerifier, { httpOnly: true, sameSite: 'lax', maxAge: 300 })
  response.cookies.set('oauth_state',   state,        { httpOnly: true, sameSite: 'lax', maxAge: 300 })
  return response
}
