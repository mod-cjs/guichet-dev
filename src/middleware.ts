import { NextRequest, NextResponse } from 'next/server'
import { getSession, encodeSession, setSessionCookie } from '@/lib/auth'
import { isSessionActive } from '@/lib/session-store'
import { saveTokens, clearTokens } from '@/lib/token-store'
import { revokeToken } from '@/lib/sso-client'
import { ADMIN_ROLES } from '@/lib/auth/admin-roles'
import { isConseillerRole, isRecruteurRole } from '@/lib/auth/espace-roles'
import { basePublique } from '@/lib/security/base-publique'

const BENEFICIAIRE_ROLES = new Set(['beneficiaire', 'jeune', 'chercheur_d_emploi'])

const PROTECTED: { pattern: RegExp; check: (roles: string[]) => boolean }[] = [
  { pattern: /^\/jeune\//,     check: roles => roles.some(r => BENEFICIAIRE_ROLES.has(r)) },
  { pattern: /^\/recruteur\//, check: roles => isRecruteurRole(roles)                     },
  { pattern: /^\/admin\//,     check: roles => roles.some(r => ADMIN_ROLES.has(r))        },
  // GUIC-526 — gate authentification seule : pendant la transition D2, l'accès
  // conseiller vaut « rôle SSO OU rattachement AgentCentre » et seul le layout
  // peut lire la base. Passage en check strict quand les comptes seront migrés.
  { pattern: /^\/conseiller(\/|$)/, check: () => true },
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

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  const matched = PROTECTED.find(r => r.pattern.test(pathname))
  if (!matched) return NextResponse.next()

  const base    = basePublique(request)
  const session = await getSession(request)

  if (!session) {
    const loginUrl = new URL('/auth/connexion', base)
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

  // Vérifier la denylist Redis (backchannel logout SSO)
  if (!(await isSessionActive(session.cjsUid))) {
    const response = NextResponse.redirect(new URL('/auth/connexion', base))
    response.cookies.delete('cjs_session')
    return response
  }

  if (!matched.check(session.roles)) {
    const home = roleHome(session.roles)
    if (home) return NextResponse.redirect(new URL(home, base))
    const response = NextResponse.redirect(new URL('/auth/connexion?error=no_role', base))
    response.cookies.delete('cjs_session')
    return response
  }

  if (
    session.roles.some(r => BENEFICIAIRE_ROLES.has(r)) &&
    !session.onboardingComplete &&
    !pathname.startsWith('/jeune/onboarding')
  ) {
    return NextResponse.redirect(new URL('/jeune/onboarding', base))
  }

  const now = Math.floor(Date.now() / 1000)
  if (session.expiresAt - now < REFRESH_THRESHOLD && session.refreshToken) {
    try {
      const oldToken = session.accessToken
      const tokens   = await refreshToken(session.refreshToken)
      const newExpiresAt = now + tokens.expires_in
      const updated  = {
        ...session,
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt:    newExpiresAt,
      }
      // Persiste les nouveaux tokens dans Redis (cf token-store GUIC-166)
      await saveTokens(session.cjsUid, {
        accessToken:  tokens.access_token,
        refreshToken: tokens.refresh_token,
        expiresAt:    newExpiresAt,
      })
      const encoded  = await encodeSession(updated)
      const response = NextResponse.next()
      setSessionCookie(response, encoded, tokens.expires_in)
      // Révoquer l'ancien token en arrière-plan (ne bloque pas la réponse)
      if (oldToken) revokeToken(oldToken).catch(() => {})
      return response
    } catch {
      const loginUrl = new URL('/auth/connexion', request.url)
      const response = NextResponse.redirect(loginUrl)
      response.cookies.delete('cjs_session')
      await clearTokens(session.cjsUid).catch(() => {})
      return response
    }
  }

  return NextResponse.next()
}

function roleHome(roles: string[]): string | null {
  if (roles.some(r => ADMIN_ROLES.has(r)))        return '/admin/tableau-de-bord'
  if (isRecruteurRole(roles))                     return '/recruteur/tableau-de-bord'
  if (isConseillerRole(roles))                    return '/conseiller'
  if (roles.some(r => BENEFICIAIRE_ROLES.has(r))) return '/jeune/tableau-de-bord'
  return null
}

export const config = {
  // Node.js runtime requis : le middleware utilise ioredis (session-store)
  // qui n'est pas Edge-compatible. Next.js 16 a stabilisé ce runtime et
  // remplacé l'ancien experimental.nodeMiddleware par cette déclaration.
  runtime: 'nodejs',
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api/auth/).*)'],
}
