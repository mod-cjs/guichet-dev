import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { refreshAccessToken } from '@/lib/sso-client'
import { encodeSession, setSessionCookie } from '@/lib/auth'

const PROTECTED: { pattern: RegExp; role: string }[] = [
  { pattern: /^\/jeune\//,     role: 'beneficiaire' },
  { pattern: /^\/recruteur\//, role: 'recruteur'    },
  { pattern: /^\/admin\//,     role: 'admin'        },
]

// Renouvelle le token si l'expiry est dans moins de 5 minutes
const REFRESH_THRESHOLD = 5 * 60 // secondes

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const matched = PROTECTED.find(r => r.pattern.test(pathname))
  if (!matched) return NextResponse.next()

  const session = await getSession(request)

  if (!session) {
    const loginUrl = new URL('/auth/connexion', request.url)
    const response = NextResponse.redirect(loginUrl)
    // Sauvegarder la page demandée pour rediriger après login
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

  // Rafraîchir le token si proche de l'expiry
  const now = Math.floor(Date.now() / 1000)
  if (session.expiresAt - now < REFRESH_THRESHOLD) {
    try {
      const tokens   = await refreshAccessToken(session.refreshToken)
      const updated  = {
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
      // Refresh échoué → déconnecter proprement
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
