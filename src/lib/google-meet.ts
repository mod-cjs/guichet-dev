// Connexion Google Meet / Calendar par recruteur — profil entreprise.
// OAuth utilisateur (client GOOGLE_MEET_CLIENT_ID/SECRET) ; tant que ces clés ne
// sont pas posées, l'état est « non_configure » et rien n'est cliquable.
// Usage : génération auto d'un lien Meet à la planification d'un entretien Visio.

import { prisma } from '@/lib/prisma'
import { logger } from '@/lib/logger'
import { appUrl } from '@/lib/app-url'

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo'
const CALENDAR_EVENTS_URL =
  'https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1'
export const MEET_SCOPES = 'openid email https://www.googleapis.com/auth/calendar.events'

export type MeetStatut = 'non_configure' | 'non_connecte' | 'connecte' | 'expire'

export interface MeetEtat {
  statut: MeetStatut
  email: string | null
}

/** Les clés OAuth serveur sont-elles posées ? */
export function meetConfigured(): boolean {
  return Boolean(process.env.GOOGLE_MEET_CLIENT_ID && process.env.GOOGLE_MEET_CLIENT_SECRET)
}

export function meetRedirectUri(): string {
  return `${appUrl()}/api/recruteur/google-meet/callback`
}

/** URL de consentement Google (state anti-CSRF fourni par la route). */
export function buildMeetAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_MEET_CLIENT_ID ?? '',
    redirect_uri: meetRedirectUri(),
    response_type: 'code',
    scope: MEET_SCOPES,
    access_type: 'offline',
    prompt: 'consent',
    state,
  })
  return `${AUTH_URL}?${params.toString()}`
}

interface TokenResponse {
  access_token: string
  refresh_token?: string
  expires_in: number
}

/** Échange le code d'autorisation contre des tokens. */
export async function exchangeMeetCode(code: string): Promise<TokenResponse> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_MEET_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_MEET_CLIENT_SECRET ?? '',
      redirect_uri: meetRedirectUri(),
      grant_type: 'authorization_code',
    }),
  })
  if (!res.ok) throw new Error(`Google token error: ${res.status} — ${await res.text().catch(() => '')}`)
  return (await res.json()) as TokenResponse
}

/** Récupère l'email du compte Google connecté. */
export async function fetchGoogleEmail(accessToken: string): Promise<string> {
  const res = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` } })
  if (!res.ok) throw new Error(`Google userinfo error: ${res.status}`)
  const info = (await res.json()) as { email?: string }
  return info.email ?? 'compte Google'
}

/** État de la connexion Meet d'un recruteur (pour la carte du profil). */
export async function getMeetEtat(cjsUid: string): Promise<MeetEtat> {
  if (!meetConfigured()) return { statut: 'non_configure', email: null }
  const auth = await prisma.recruteurGoogleAuth.findUnique({ where: { cjsUid } })
  if (!auth) return { statut: 'non_connecte', email: null }
  const expire = auth.expiresAt.getTime() < Date.now() && !auth.refreshToken
  return { statut: expire ? 'expire' : 'connecte', email: auth.googleEmail }
}

/** Renvoie un access token frais (refresh si expiré). `null` si non connecté/rafraîchissable. */
async function freshAccessToken(cjsUid: string): Promise<string | null> {
  const auth = await prisma.recruteurGoogleAuth.findUnique({ where: { cjsUid } })
  if (!auth) return null
  if (auth.expiresAt.getTime() > Date.now() + 60_000) return auth.accessToken
  if (!auth.refreshToken) return null

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: auth.refreshToken,
      client_id: process.env.GOOGLE_MEET_CLIENT_ID ?? '',
      client_secret: process.env.GOOGLE_MEET_CLIENT_SECRET ?? '',
      grant_type: 'refresh_token',
    }),
  })
  if (!res.ok) {
    logger.warn('[google-meet] refresh échoué', { cjsUid, status: res.status })
    return null
  }
  const token = (await res.json()) as TokenResponse
  await prisma.recruteurGoogleAuth.update({
    where: { cjsUid },
    data: { accessToken: token.access_token, expiresAt: new Date(Date.now() + token.expires_in * 1000) },
  })
  return token.access_token
}

/**
 * Crée un événement Calendar avec visioconférence Meet et renvoie le lien.
 * Fail-soft : `null` si non connecté ou en cas d'erreur API (l'appelant garde son flux).
 */
export async function creerLienMeet(
  cjsUid: string,
  entretien: { titre: string; dateHeure: Date; dureeMinutes?: number },
): Promise<string | null> {
  if (!meetConfigured()) return null
  try {
    const accessToken = await freshAccessToken(cjsUid)
    if (!accessToken) return null

    const fin = new Date(entretien.dateHeure.getTime() + (entretien.dureeMinutes ?? 45) * 60_000)
    const res = await fetch(CALENDAR_EVENTS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: entretien.titre,
        start: { dateTime: entretien.dateHeure.toISOString() },
        end: { dateTime: fin.toISOString() },
        conferenceData: { createRequest: { requestId: `guichet-${cjsUid}-${entretien.dateHeure.getTime()}`, conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      }),
    })
    if (!res.ok) {
      logger.warn('[google-meet] création événement échouée', { cjsUid, status: res.status })
      return null
    }
    const event = (await res.json()) as { hangoutLink?: string }
    return event.hangoutLink ?? null
  } catch (err) {
    logger.warn('[google-meet] erreur inattendue (fail-soft)', {
      cjsUid,
      err: err instanceof Error ? err.message : String(err),
    })
    return null
  }
}
