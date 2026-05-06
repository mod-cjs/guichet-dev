import { NextRequest, NextResponse } from 'next/server'
import { getSession, encodeSession, setSessionCookie } from '@/lib/auth'

const PROTECTED: { pattern: RegExp; role: string }[] = [
  { pattern: /^\/jeune\//,     role: 'beneficiaire' },
  { pattern: /^\/recruteur\//, role: 'recruteur'    },
  { pattern: /^\/admin\//,     role: 'admin'        },
]

const REFRESH_THRESHOLD = 5 * 60 // secondes

// Refresh inline — Edge-compatible, pas d'import Node.js crypto
async function refreshToken(token: string) {
  const res = await fetch(`${process.env.SSO_BASE_URL}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type:    'refresh_token',
      client_id:     process.env.SSO_CLIENT_ID,
      client_secret: process.env.SSO_CLIENT_SECRET ?? '',
      refresh_token: token,
    }),
  })
  if (!res.ok) throw new Error('refresh failed')
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const matched = PROTECTED.find(r => r.pattern.test(pathname))
  if (!matched) return NextResponse.next()

  const session = await getSession(request)

  if (!session) {
    const loginUrl = new URL('/auth/connexion', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.set('auth_return_to', pathname + request.nextUrl.search, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   600,
      path:     '/',
    })
    return response
  }

  if (!session.roles.includes(matched.role)) {
    return NextResponse.json(
      { error: { code: 'FORBIDDEN', message: 'Accès non autorisé' } },
      { status: 403 }
    )
  }

  if (
    session.roles.includes('beneficiaire') &&
    !session.onboardingComplete &&
    !pathname.startsWith('/jeune/onboarding')
  ) {
    return NextResponse.redirect(new URL('/jeune/onboarding', request.url))
  }

  const now = Math.floor(Date.now() / 1000)
  if (session.expiresAt - now < REFRESH_THRESHOLD) {
    try {
      const tokens  = await refreshToken(session.refreshToken)
      const updated = {
        ...session,
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt:    now + tokens.expires_in,
      }
      const encoded  = await encodeSession(updated)
      const response = NextResponse.next()
      setSessionCookie(response, encoded, tokens.expires_in)
      return response
    } catch {
      const loginUrl = new URL('/auth/connexion', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('cjs_session')
      return response
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/).*)'],
}
