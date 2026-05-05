import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import type { CJSSession } from '@/types/user'

// Compatible Edge Runtime — aucun import Node.js

const SESSION_COOKIE = 'cjs_session'
const JWT_ISSUER     = 'guichet-jeunesse'
const JWT_AUDIENCE   = 'guichet-jeunesse'

function getSecret(): Uint8Array {
  // SESSION_SECRET prioritaire, NEXTAUTH_SECRET comme fallback (compatibilité)
  const s = process.env.SESSION_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('SESSION_SECRET manquant')
  return new TextEncoder().encode(s)
}

// ── Encode / decode ───────────────────────────────────────────────────────

export async function encodeSession(session: CJSSession): Promise<string> {
  return new SignJWT(session as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(session.expiresAt)
    .sign(getSecret())
}

async function decodeSession(token: string): Promise<CJSSession | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer:   JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    return payload as unknown as CJSSession
  } catch {
    return null
  }
}

// ── Lecture de session ────────────────────────────────────────────────────

export async function getSession(request?: NextRequest): Promise<CJSSession | null> {
  let value: string | undefined
  if (request) {
    value = request.cookies.get(SESSION_COOKIE)?.value
  } else {
    const store = await cookies()
    value = store.get(SESSION_COOKIE)?.value
  }
  if (!value) return null
  return decodeSession(value)
}

export async function isAuthenticated(request?: NextRequest): Promise<boolean> {
  return (await getSession(request)) !== null
}

export async function hasRole(role: string): Promise<boolean> {
  const session = await getSession()
  return session?.roles.includes(role) ?? false
}

// ── Écriture / suppression du cookie ─────────────────────────────────────

export function setSessionCookie(response: NextResponse, encoded: string, maxAge: number): void {
  response.cookies.set(SESSION_COOKIE, encoded, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge,
    path:     '/',
  })
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.delete(SESSION_COOKIE)
}
