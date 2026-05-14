import { NextRequest, NextResponse } from 'next/server'
import { getSession, encodeSession, setSessionCookie } from '@/lib/auth'
import { isSessionActive } from '@/lib/session-store'

const BENEFICIAIRE_ROLES = new Set(['beneficiaire', 'jeune', 'chercheur_d_emploi'])

const PROTECTED: { pattern: RegExp; check: (roles: string[]) => boolean }[] = [
  { pattern: /^\/jeune\//,     check: roles => roles.some(r => BENEFICIAIRE_ROLES.has(r)) },
  { pattern: /^\/recruteur\//, check: roles => roles.includes('recruteur')                },
  { pattern: /^\/admin\//,     check: roles => roles.includes('admin')                    },
]

const REFRESH_THRESHOLD = 5 * 60 // secondes

async function refreshToken(token: string) {
  const res = await fetch(`${process.env.SSO_BASE_URL}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type:    'refresh_token',
      client_id:     process.env.SSO_CLIENT_ID,
      refresh_token: token,
    }),
  })
  if (!res.ok) throw new Error('refresh failed')
  return res.json() as Promise<{ access_token: string; refresh_token: string; expires_in: number }>
}

export async function proxy(request: NextRequest) {
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

  // Vérifier la révocation Redis — fail-open si Redis indisponible
  const active = await isSessionActive(session.cjsUid)
  if (!active) {
    const loginUrl = new URL('/auth/connexion?error=session_expired', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('cjs_session')
    return response
  }

  if (!matched.check(session.roles)) {
    // Rediriger vers le bon espace sans effacer la session
    const home = roleHome(session.roles)
    if (home) return NextResponse.redirect(new URL(home, request.url))
    // Aucun rôle connu → déconnexion propre
    const response = NextResponse.redirect(new URL('/auth/connexion?error=no_role', request.url))
    response.cookies.delete('cjs_session')
    return response
  }

  if (
    session.roles.some(r => BENEFICIAIRE_ROLES.has(r)) &&
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

function roleHome(roles: string[]): string | null {
  if (roles.includes('admin'))                  return '/admin/tableau-de-bord'
  if (roles.includes('recruteur'))              return '/recruteur/tableau-de-bord'
  if (roles.some(r => BENEFICIAIRE_ROLES.has(r))) return '/jeune/tableau-de-bord'
  return null
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/).*)'],
}
