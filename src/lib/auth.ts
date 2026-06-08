import { SignJWT, jwtVerify, type JWTPayload } from 'jose'
import { cookies } from 'next/headers'
import { type NextRequest, NextResponse } from 'next/server'
import type { CJSSession } from '@/types/user'
import { getTokens } from '@/lib/token-store'

// Compatible Edge Runtime jusqu'à getSession qui utilise token-store (Node uniquement).

const SESSION_COOKIE = 'cjs_session'
const JWT_ISSUER     = 'guichet-jeunesse'
const JWT_AUDIENCE   = 'guichet-jeunesse'

function getSecret(): Uint8Array {
  // SESSION_SECRET prioritaire, NEXTAUTH_SECRET comme fallback (compatibilité)
  const s = process.env.SESSION_SECRET ?? process.env.NEXTAUTH_SECRET
  if (!s) throw new Error('SESSION_SECRET manquant')
  return new TextEncoder().encode(s)
}

// ── Cookie payload (minimal — GUIC-166) ───────────────────────────────────
// Le cookie JWT NE contient PAS access/refresh tokens (trop volumineux —
// causait des soucis SafariMobile et limites proxy). Les tokens sont
// stockés dans Redis via lib/token-store et assemblés à la lecture.

interface MinimalSessionClaims {
  cjsUid:             string
  nom:                string
  prenom:             string
  email:              string | null
  telephone:          string | null
  region:             string | null
  roles:              string[]
  onboardingComplete: boolean
  expiresAt:          number
}

function pickMinimalClaims(session: CJSSession): MinimalSessionClaims {
  return {
    cjsUid:             session.cjsUid,
    nom:                session.nom,
    prenom:             session.prenom,
    email:              session.email,
    telephone:          session.telephone,
    region:             session.region,
    roles:              session.roles,
    onboardingComplete: session.onboardingComplete,
    expiresAt:          session.expiresAt,
  }
}

// ── Encode / decode ───────────────────────────────────────────────────────

export async function encodeSession(session: CJSSession): Promise<string> {
  // Ne sérialise que les claims légères dans le JWT (cookie ~400 bytes).
  return new SignJWT(pickMinimalClaims(session) as unknown as JWTPayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setExpirationTime(session.expiresAt)
    .sign(getSecret())
}

async function decodeSessionMinimal(token: string): Promise<MinimalSessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer:   JWT_ISSUER,
      audience: JWT_AUDIENCE,
    })
    return payload as unknown as MinimalSessionClaims
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

  const minimal = await decodeSessionMinimal(value)
  if (!minimal) return null

  // Assemble : cookie minimal + tokens lus depuis Redis
  // Si Redis indispo ou clé absente, retourne quand même la session avec tokens
  // vides — le user reste connecté pour la navigation mais un refresh échouera.
  const tokens = await getTokens(minimal.cjsUid)

  return {
    cjsUid:             minimal.cjsUid,
    nom:                minimal.nom,
    prenom:             minimal.prenom,
    email:              minimal.email,
    telephone:          minimal.telephone,
    region:             minimal.region,
    roles:              minimal.roles,
    onboardingComplete: minimal.onboardingComplete,
    expiresAt:          tokens?.expiresAt ?? minimal.expiresAt,
    accessToken:        tokens?.accessToken  ?? '',
    refreshToken:       tokens?.refreshToken ?? '',
  }
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
  // SameSite=Lax (GUIC-259) — corrige la régression post-SSO sur Vercel prod.
  //
  // Avec sameSite='strict', le cookie posé par /auth/callback était rejeté
  // par le navigateur sur le redirect 302 vers /jeune/tableau-de-bord car la
  // navigation a démarré depuis SSO (cross-site initiator). Conséquence :
  // middleware reçoit une requête sans cookie session → redirect /auth/connexion
  // → boucle de login (logs Vercel 2026-06-08).
  //
  // SameSite=Lax bloque toujours le CSRF cross-site sur les méthodes non-safe
  // (POST/PUT/DELETE). Pour les actions sensibles, httpOnly + Secure + CSRF
  // origin check restent la défense. Conforme CDP loi 2008-12.
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
