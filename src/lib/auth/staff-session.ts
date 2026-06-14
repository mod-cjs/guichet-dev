/**
 * GUIC-387 — Session staff centre (MVP) : cookie JWT httpOnly.
 *
 * Auth simplifiée MVP : whitelist `CONSEILLER_STAFF_EMAILS` (CSV).
 * Le cookie contient `{ email, centreId }` signé HS256 via
 * `STAFF_SESSION_SECRET`. Durée 12h.
 *
 * NB : à remplacer par auth SSO conseiller (rôle `centre_conseiller`)
 * en Sprint+1 — cf ADR-003.
 */

import { SignJWT, jwtVerify } from 'jose'
import { cookies } from 'next/headers'

export const STAFF_COOKIE = 'centre_staff_session'
const ISSUER = 'guichet-jeunesse'
const AUDIENCE = 'centre-staff'
const TTL_SECONDS = 12 * 3600

export interface StaffSession {
  email:    string
  centreId: string
}

function getSecret(): Uint8Array {
  const s = process.env.STAFF_SESSION_SECRET
  if (!s) throw new Error('STAFF_SESSION_SECRET manquant')
  return new TextEncoder().encode(s)
}

export function getAllowedStaffEmails(): string[] {
  const raw = process.env.CONSEILLER_STAFF_EMAILS ?? ''
  return raw
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0)
}

export function isAllowedStaffEmail(email: string): boolean {
  return getAllowedStaffEmails().includes(email.trim().toLowerCase())
}

export async function createStaffSession(session: StaffSession): Promise<string> {
  return await new SignJWT({ ...session })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(ISSUER)
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${TTL_SECONDS}s`)
    .sign(getSecret())
}

export async function setStaffSessionCookie(session: StaffSession): Promise<void> {
  const token = await createStaffSession(session)
  const jar = await cookies()
  jar.set(STAFF_COOKIE, token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path:     '/',
    maxAge:   TTL_SECONDS,
  })
}

export async function getStaffSession(): Promise<StaffSession | null> {
  const jar = await cookies()
  const token = jar.get(STAFF_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer:     ISSUER,
      audience:   AUDIENCE,
      algorithms: ['HS256'],
    })
    if (typeof payload.email !== 'string' || typeof payload.centreId !== 'string') {
      return null
    }
    return { email: payload.email, centreId: payload.centreId }
  } catch {
    return null
  }
}

export async function clearStaffSession(): Promise<void> {
  const jar = await cookies()
  jar.set(STAFF_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
}
