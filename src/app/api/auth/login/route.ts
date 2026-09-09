import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizationUrl } from '@/lib/sso-client'
import { safeReturnTo } from '@/lib/security/safe-return-to'

export async function GET(request: NextRequest) {
  // Après un logout explicite, forcer la saisie des credentials SSO
  // même si une session SSO est encore active (protection appareils partagés).
  const forceLogin = request.cookies.get('force_login')?.value === '1'

  // GUIC-689 — destination de retour après connexion. Le callback SSO lit déjà
  // `auth_return_to` ; il n'était alimenté que par le middleware (pages
  // protégées) et par le flux WhatsApp. Un jeune qui clique « Ajouter aux
  // favoris » depuis une page publique atterrissait donc sur son tableau de
  // bord, sans sa ressource et sans son favori.
  // La valeur vient du client : elle passe par la même whitelist stricte que
  // partout ailleurs (GUIC-241), sinon elle est simplement ignorée.
  const retour = safeReturnTo(request.nextUrl.searchParams.get('next'))

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

  if (retour) {
    response.cookies.set('auth_return_to', retour, {
      httpOnly: true,
      secure,
      sameSite: 'lax',
      maxAge:   300,
      path:     '/',
    })
  }

  // Consommer le flag — une seule utilisation
  response.cookies.delete('force_login')

  return response
}
