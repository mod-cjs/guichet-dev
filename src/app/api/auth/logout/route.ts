import { NextRequest, NextResponse } from 'next/server'
import { getSession, clearSessionCookie } from '@/lib/auth'
import { revokeToken } from '@/lib/sso-client'
import { revokeSession } from '@/lib/session-store'
import { clearTokens } from '@/lib/token-store'
import { basePublique } from '@/lib/security/base-publique'
import { logger } from '@/lib/logger'

const APP_URL = process.env.NEXTAUTH_URL ?? ''

// POST uniquement — GET serait vulnérable au CSRF via <img src="...">
export async function POST(request: NextRequest) {
  // Vérifier que la requête vient bien du Guichet (protection CSRF)
  const origin  = request.headers.get('origin')  ?? ''
  const referer = request.headers.get('referer') ?? ''
  const allowed = origin === APP_URL || referer.startsWith(APP_URL)
  if (APP_URL && !allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const session  = await getSession()
  const response = NextResponse.redirect(new URL('/', basePublique(request)))

  if (session) {
    await Promise.allSettled([
      session.accessToken
        ? revokeToken(session.accessToken).catch(err =>
            logger.warn('auth/logout: révocation SSO échouée', {
              error: err instanceof Error ? err.message : String(err),
            })
          )
        : Promise.resolve(),
      revokeSession(session.cjsUid),
      clearTokens(session.cjsUid),
    ])
  }

  clearSessionCookie(response)

  // Signaler au prochain /api/auth/login que l'utilisateur vient de se déconnecter
  // explicitement → le SSO demandera ses credentials même si sa session SSO est active.
  // TTL court (10 min) : si l'utilisateur ne se reconnecte pas, le cookie expire seul.
  response.cookies.set('force_login', '1', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge:   600,
    path:     '/',
  })

  return response
}

// Compatibilité liens <a> pendant la transition — redirige vers POST via page
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/auth/deconnexion', basePublique(request)))
}
