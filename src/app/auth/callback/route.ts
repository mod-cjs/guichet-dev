import { NextRequest, NextResponse } from 'next/server'
import { exchangeCode, getUserInfo, revokeToken, type TokenResponse } from '@/lib/sso-client'
import { encodeSession, setSessionCookie } from '@/lib/auth'
import { saveTokens } from '@/lib/token-store'
import { clearRevocation } from '@/lib/session-store'
import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { safeReturnTo } from '@/lib/security/safe-return-to'
import type { CJSSession } from '@/types/user'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code         = searchParams.get('code')
  const state        = searchParams.get('state')
  const storedState  = request.cookies.get('oauth_state')?.value
  const pkceVerifier = request.cookies.get('pkce_verifier')?.value
  const returnTo     = request.cookies.get('auth_return_to')?.value

  if (!code || !state || state !== storedState || !pkceVerifier) {
    return NextResponse.redirect(new URL('/auth/connexion?error=invalid_state', request.url))
  }

  let tokens: TokenResponse | undefined
  try {
    tokens = await exchangeCode(code, pkceVerifier)
    const claims = await getUserInfo(tokens.access_token)

    logger.info('sso-claims-debug', {
      sub:          claims.sub,
      cjs_roles_raw: claims.cjs_roles,
      cjs_roles_type: typeof claims.cjs_roles,
      cjs_status:   claims.cjs_status,
    })

    const roles = Array.isArray(claims.cjs_roles)
      ? claims.cjs_roles
      : String(claims.cjs_roles).split(',').map(r => r.trim()).filter(Boolean)

    logger.info('sso-roles-resolved', { roles, destination_preview: roles.length === 0 ? 'no_role' : roles[0] })

    if (roles.length === 0) {
      await revokeToken(tokens.access_token).catch(() => {})
      return NextResponse.redirect(new URL('/auth/connexion?error=no_role', request.url))
    }

    if (claims.cjs_status && claims.cjs_status !== 'active') {
      await revokeToken(tokens.access_token).catch(() => {})
      return NextResponse.redirect(new URL('/auth/connexion?error=account_inactive', request.url))
    }

    // Upsert Utilisateur — synchronise les données SSO en base
    const utilisateur = await prisma.utilisateur.upsert({
      where:  { cjsUid: claims.sub },
      update: {
        nom:    claims.family_name ?? undefined,
        prenom: claims.given_name  ?? undefined,
        email:  claims.email       ?? undefined,
      },
      create: {
        cjsUid:    claims.sub,
        nom:       claims.family_name ?? '',
        prenom:    claims.given_name  ?? '',
        email:     claims.email       ?? undefined,
        telephone: toE164(claims.phone_number),
      },
      select: { onboardingComplete: true, region: true, commune: true },
    })

    const session: CJSSession = {
      cjsUid:             claims.sub,
      nom:                claims.family_name ?? '',
      prenom:             claims.given_name  ?? '',
      email:              claims.email,
      telephone:          toE164(claims.phone_number) ?? null,
      region:             utilisateur.region ?? claims.address?.region ?? null,
      roles,
      accessToken:        tokens.access_token,
      refreshToken:       tokens.refresh_token,
      expiresAt:          Math.floor(Date.now() / 1000) + tokens.expires_in,
      onboardingComplete: utilisateur.onboardingComplete,
    }

    // GUIC-166 : tokens stockés dans Redis, pas dans le cookie
    await saveTokens(claims.sub, {
      accessToken:  tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt:    session.expiresAt,
    })

    // Nettoyer toute révocation précédente (sinon le middleware redirige en
    // boucle pendant 7 jours après une déconnexion — cf bug GUIC-166).
    // Le user vient de re-prouver son identité au SSO, sa session précédente
    // n'a plus à le bloquer.
    await clearRevocation(claims.sub)

    const encoded = await encodeSession(session)
    logger.info('session-size', {
      accessToken:  tokens.access_token.length,
      refreshToken: tokens.refresh_token.length,
      cookieJwt:    encoded.length,
    })
    // Un bénéficiaire non-onboardé doit toujours passer par le wizard, même avec returnTo
    const isBeneficiaire = session.roles.includes('beneficiaire')
    const destination =
      isBeneficiaire && !session.onboardingComplete
        ? '/jeune/onboarding'
        : (safeReturnTo(returnTo) ?? roleRedirect(session))
    const response    = NextResponse.redirect(new URL(destination, request.url))

    setSessionCookie(response, encoded, tokens.expires_in)
    response.cookies.delete('pkce_verifier')
    response.cookies.delete('oauth_state')
    response.cookies.delete('auth_return_to')

    return response
  } catch (err) {
    if (tokens?.access_token) {
      await revokeToken(tokens.access_token).catch(() => {})
    }
    logger.error('auth/callback: échec authentification SSO', {
      error: err instanceof Error ? err.message : String(err),
    })
    return NextResponse.redirect(new URL('/auth/connexion?error=auth_failed', request.url))
  }
}

const BENEFICIAIRE_ROLES = new Set(['beneficiaire', 'jeune', 'chercheur_d_emploi'])

/**
 * Normalise un numéro de téléphone en E.164.
 * Gère les formats : +221XXXXXXXXX, 00221XXXXXXXXX, et locaux sénégalais 9 chiffres.
 * Retourne undefined si null/vide, le numéro tel quel si format non reconnu.
 */
function toE164(phone: string | null | undefined): string | undefined {
  if (!phone) return undefined
  const cleaned = phone.replace(/[\s\-\.\(\)]/g, '')
  if (cleaned.startsWith('+'))  return cleaned
  if (cleaned.startsWith('00')) return '+' + cleaned.slice(2)
  if (/^\d{9}$/.test(cleaned))  return '+221' + cleaned
  return cleaned
}
const ADMIN_ROLES        = new Set(['admin', 'moderator', 'super_admin'])

function roleRedirect(session: CJSSession): string {
  if (session.roles.some(r => ADMIN_ROLES.has(r)))        return '/admin/tableau-de-bord'
  if (session.roles.includes('recruteur'))                 return '/recruteur/tableau-de-bord'
  if (session.roles.some(r => BENEFICIAIRE_ROLES.has(r))) {
    return session.onboardingComplete ? '/jeune/tableau-de-bord' : '/jeune/onboarding'
  }
  return '/auth/connexion?error=no_role'
}

// GUIC-241 — `safeReturnTo` extrait dans `@/lib/security/safe-return-to` pour
// permettre un test unitaire isolé (pas d'import de next/server, prisma, etc.).
