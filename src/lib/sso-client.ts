// Web Crypto API — compatible Edge Runtime + Node.js 18+
// Pas d'import Node.js crypto

const SSO_BASE_URL = process.env.SSO_BASE_URL!;
const CLIENT_ID    = process.env.SSO_CLIENT_ID!;
const REDIRECT_URI  = `${process.env.NEXTAUTH_URL}/auth/callback`;
const API_KEY    = process.env.SSO_API_KEY    ?? '';
const API_SECRET = process.env.SSO_API_SECRET ?? '';
const DEFAULT_SCOPE = 'openid profile email phone address cjs_roles';

export interface TokenResponse {
  access_token:  string
  refresh_token: string
  id_token:      string
  expires_in:    number
  token_type:    string
}

export interface CJSClaims {
  sub:                    string
  name:                   string
  given_name:             string
  family_name:            string
  email:                  string | null
  email_verified:         boolean
  phone_number:           string | null
  phone_number_verified:  boolean
  address?:               { region?: string }
  cjs_roles:              string[]
  cjs_status:             string
}

export interface IntrospectionResult {
  active:      boolean
  sub:         string
  scope:       string
  exp:         number
  cjs_roles?:  string[]
  cjs_status?: string
  region?:     string
}

// ── PKCE helpers (Web Crypto) ─────────────────────────────────────────────

function randomBase64Url(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength))
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

async function pkceChallenge(verifier: string): Promise<string> {
  const data   = new TextEncoder().encode(verifier)
  const hash   = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
}

// ── HMAC headers server-to-server (Web Crypto) ────────────────────────────

async function buildHmacHeaders(body: string): Promise<HeadersInit> {
  if (!API_KEY || !API_SECRET) {
    throw new Error('SSO_API_KEY et SSO_API_SECRET requis pour les appels server-to-server')
  }
  const enc       = new TextEncoder()
  const timestamp = Math.floor(Date.now() / 1000).toString()

  const bodyHashBuf = await crypto.subtle.digest('SHA-256', enc.encode(body))
  const bodyHash    = Array.from(new Uint8Array(bodyHashBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  const message = `${API_KEY}\n${timestamp}\n${bodyHash}`

  const key = await crypto.subtle.importKey(
    'raw', enc.encode(API_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false, ['sign'],
  )
  const sigBuf    = await crypto.subtle.sign('HMAC', key, enc.encode(message))
  const signature = Array.from(new Uint8Array(sigBuf))
    .map(b => b.toString(16).padStart(2, '0')).join('')

  return {
    'X-CJS-Api-Key':   API_KEY,
    'X-CJS-Timestamp': timestamp,
    'X-CJS-Signature': signature,
    'Content-Type':    'application/json',
    Accept:            'application/json',
  }
}

// ── Flux OAuth PKCE ───────────────────────────────────────────────────────

export async function getAuthorizationUrl(
  scope      = DEFAULT_SCOPE,
  forceLogin = false,
): Promise<{ url: string; state: string; pkceVerifier: string }> {
  const state        = randomBase64Url(32)
  const pkceVerifier = randomBase64Url(43)
  const challenge    = await pkceChallenge(pkceVerifier)

  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          REDIRECT_URI,
    response_type:         'code',
    scope,
    state,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    ...(forceLogin ? { prompt: 'login' } : {}),
  })

  return {
    url: `${SSO_BASE_URL}/oauth/authorize?${params}`,
    state,
    pkceVerifier,
  }
}

export async function exchangeCode(
  code: string,
  pkceVerifier: string,
): Promise<TokenResponse> {
  const res = await fetch(`${SSO_BASE_URL}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type:    'authorization_code',
      client_id:     CLIENT_ID,
      code,
      redirect_uri:  REDIRECT_URI,
      code_verifier: pkceVerifier,
    }),
  })
  if (!res.ok) throw new Error(`SSO token exchange failed: ${res.status}`)
  return res.json()
}

export async function getUserInfo(accessToken: string): Promise<CJSClaims> {
  const res = await fetch(`${SSO_BASE_URL}/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
  if (!res.ok) throw new Error(`SSO userinfo failed: ${res.status}`)
  return res.json()
}

export async function refreshAccessToken(token: string): Promise<TokenResponse> {
  const res = await fetch(`${SSO_BASE_URL}/oauth/token`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      refresh_token: token,
    }),
  })
  if (!res.ok) throw new Error(`SSO refresh failed: ${res.status}`)
  return res.json()
}

export async function revokeToken(accessToken: string): Promise<void> {
  await fetch(`${SSO_BASE_URL}/oauth/token/revoke`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
  })
}

export async function verifyToken(
  token:         string,
  includeClaims = false,
): Promise<IntrospectionResult> {
  const body = JSON.stringify({ token, include_claims: includeClaims })
  const res  = await fetch(`${SSO_BASE_URL}/oauth/token/verify`, {
    method:  'POST',
    headers: await buildHmacHeaders(body),
    body,
  })
  if (!res.ok) throw new Error(`SSO token verify failed: ${res.status}`)
  return res.json()
}
