/**
 * GUIC-394 — Fixture Playwright : auth staff via cookie direct.
 *
 * Le formulaire `/centre-staff/login` requiert que l'email soit dans la
 * whitelist `CONSEILLER_STAFF_EMAILS` et que `STAFF_SESSION_SECRET` soit
 * configuré côté serveur. Pour éviter de dépendre de ces variables au
 * runtime du test, ce helper :
 *
 *   - signe directement un JWT `centre_staff_session` avec le secret
 *     `STAFF_SESSION_SECRET` (lu côté process Playwright) ;
 *   - le pose dans le cookie httpOnly du contexte navigateur.
 *
 * Pré-requis : la variable `STAFF_SESSION_SECRET` doit être présente côté
 * process Next.js ET côté process Playwright (mêmes valeurs). Si elle n'est
 * pas définie côté Playwright, le helper la définit avant la signature
 * (et l'écrit côté Next via le webServer config — à passer en `env` côté
 * `playwright.config.ts` si on veut un secret stable).
 */

import { SignJWT } from 'jose'
import type { BrowserContext } from '@playwright/test'

const STAFF_COOKIE = 'centre_staff_session'
const ISSUER = 'guichet-jeunesse'
const AUDIENCE = 'centre-staff'
const TTL_SECONDS = 12 * 3600

function secret(): Uint8Array {
  const s = process.env.STAFF_SESSION_SECRET
  if (!s) {
    throw new Error(
      'STAFF_SESSION_SECRET manquant côté Playwright — exporter la même valeur ' +
      'que côté serveur Next.js (cf. playwright.config.ts > webServer.env).',
    )
  }
  return new TextEncoder().encode(s)
}

export async function signStaffSession(payload: {
  email:    string
  centreId: string
}): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(secret())
}

export async function loginStaffViaCookie(
  context: BrowserContext,
  params: { email: string; centreId: string; domain?: string },
): Promise<void> {
  const token = await signStaffSession({
    email:    params.email,
    centreId: params.centreId,
  })
  await context.addCookies([
    {
      name:     STAFF_COOKIE,
      value:    token,
      domain:   params.domain ?? 'localhost',
      path:     '/',
      httpOnly: true,
      secure:   false,
      sameSite: 'Strict',
    },
  ])
}
