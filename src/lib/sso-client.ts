// Client SSO CJS — OAuth 2.0 / OIDC
// Documentation complète : docs/sso.md

const SSO_BASE_URL = process.env.SSO_BASE_URL!
const CLIENT_ID    = process.env.SSO_CLIENT_ID!
const CLIENT_SECRET = process.env.SSO_CLIENT_SECRET!
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/auth/callback`

export interface TokenResponse {
  access_token: string
  refresh_token: string
  id_token: string
  expires_in: number
  token_type: string
}

export interface CJSClaims {
  sub: string           // = cjs_uid
  name: string
  given_name: string
  family_name: string
  email: string | null
  email_verified: boolean
  phone_number: string | null
  phone_number_verified: boolean
  address?: { region?: string }
  cjs_roles: string[]
  cjs_status: string
}

export function buildAuthorizeUrl(codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id:             CLIENT_ID,
    redirect_uri:          REDIRECT_URI,
    response_type:         'code',
    scope:                 'openid profile email phone address cjs_roles',
    code_challenge:        codeChallenge,
    code_challenge_method: 'S256',
    state,
  })
  return `${SSO_BASE_URL}/oauth/authorize?${params}`
}

export async function exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
  const res = await fetch(`${SSO_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'authorization_code',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri:  REDIRECT_URI,
      code_verifier: codeVerifier,
    }),
  })
  if (!res.ok) throw new Error(`SSO token exchange failed: ${res.status}`)
  return res.json()
}

export async function getUserInfo(accessToken: string): Promise<CJSClaims> {
  const res = await fetch(`${SSO_BASE_URL}/api/oauth/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok) throw new Error(`SSO userinfo failed: ${res.status}`)
  return res.json()
}

export async function refreshToken(token: string): Promise<TokenResponse> {
  const res = await fetch(`${SSO_BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'refresh_token',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: token,
    }),
  })
  if (!res.ok) throw new Error(`SSO refresh failed: ${res.status}`)
  return res.json()
}

export async function revokeToken(accessToken: string): Promise<void> {
  await fetch(`${SSO_BASE_URL}/api/oauth/token/revoke`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
}
