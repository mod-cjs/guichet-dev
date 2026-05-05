import { NextRequest, NextResponse } from 'next/server'
import { getSession, clearSessionCookie } from '@/lib/auth'
import { revokeToken } from '@/lib/sso-client'
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
  const response = NextResponse.redirect(new URL('/', request.url))

  if (session) {
    try {
      // 1. Révoquer le token côté SSO
      await revokeToken(session.accessToken)
    } catch (err) {
      logger.warn('auth/logout: révocation SSO échouée', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  clearSessionCookie(response)
  return response
}

// Compatibilité liens <a> pendant la transition — redirige vers POST via page
export async function GET(request: NextRequest) {
  return NextResponse.redirect(new URL('/auth/deconnexion', request.url))
}
