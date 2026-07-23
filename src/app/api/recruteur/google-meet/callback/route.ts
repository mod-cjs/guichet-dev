import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { redis } from '@/lib/redis'
import { logger } from '@/lib/logger'
import { appUrl } from '@/lib/app-url'
import { exchangeMeetCode, fetchGoogleEmail, MEET_SCOPES } from '@/lib/google-meet'

// Callback OAuth Google Meet : valide le state (Redis), échange le code,
// enregistre les tokens et retourne au profil entreprise avec le résultat.

function retour(param: string): NextResponse {
  return NextResponse.redirect(`${appUrl()}/recruteur/profil-entreprise?meet=${param}`)
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const state = request.nextUrl.searchParams.get('state')
  const code = request.nextUrl.searchParams.get('code')
  if (!state || !code) return retour('erreur')

  const cjsUid = await redis.get(`meet:oauth:${state}`)
  if (!cjsUid) return retour('erreur')
  await redis.del(`meet:oauth:${state}`)

  try {
    const token = await exchangeMeetCode(code)
    const email = await fetchGoogleEmail(token.access_token)
    await prisma.recruteurGoogleAuth.upsert({
      where: { cjsUid },
      create: {
        cjsUid,
        googleEmail: email,
        accessToken: token.access_token,
        refreshToken: token.refresh_token ?? null,
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
        scopes: MEET_SCOPES,
      },
      update: {
        googleEmail: email,
        accessToken: token.access_token,
        // Google n'envoie le refresh_token qu'au premier consentement : on conserve l'existant.
        ...(token.refresh_token ? { refreshToken: token.refresh_token } : {}),
        expiresAt: new Date(Date.now() + token.expires_in * 1000),
      },
    })
    return retour('ok')
  } catch (err) {
    logger.error('[google-meet] callback échoué', {
      err: err instanceof Error ? err.message : String(err),
    })
    return retour('erreur')
  }
}
