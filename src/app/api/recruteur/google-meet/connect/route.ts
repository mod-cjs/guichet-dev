import { NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { getSession } from '@/lib/auth'
import { redis } from '@/lib/redis'
import { appUrl } from '@/lib/app-url'
import { buildMeetAuthUrl, meetConfigured } from '@/lib/google-meet'

// Démarre le flux OAuth Google Meet du recruteur connecté.
// state anti-CSRF aléatoire lié au cjsUid (Redis, 10 min).

export async function GET(): Promise<NextResponse> {
  const session = await getSession()
  if (!session || !session.roles.includes('recruteur')) {
    return NextResponse.redirect(`${appUrl()}/auth/connexion`)
  }
  if (!meetConfigured()) {
    return NextResponse.redirect(`${appUrl()}/recruteur/profil-entreprise?meet=non_configure`)
  }

  const state = randomBytes(24).toString('hex')
  await redis.set(`meet:oauth:${state}`, session.cjsUid, 'EX', 600)
  return NextResponse.redirect(buildMeetAuthUrl(state))
}
