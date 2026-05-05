import { createHash, createHmac, randomBytes } from "crypto";

const SSO_BASE_URL = process.env.SSO_BASE_URL!;
const CLIENT_ID = process.env.SSO_CLIENT_ID!;
const CLIENT_SECRET = process.env.SSO_CLIENT_SECRET!;
const REDIRECT_URI = `${process.env.NEXTAUTH_URL}/auth/callback`;
const API_KEY = process.env.SSO_API_KEY ?? "";
const API_SECRET = process.env.SSO_API_SECRET ?? "";
const DEFAULT_SCOPE = "openid profile email phone address cjs_roles";

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  id_token: string;
  expires_in: number;
  token_type: string;
}

export interface CJSClaims {
  sub: string;
  name: string;
  given_name: string;
  family_name: string;
  email: string | null;
  email_verified: boolean;
  phone_number: string | null;
  phone_number_verified: boolean;
  address?: { region?: string };
  cjs_roles: string[];
  cjs_status: string;
}

export interface IntrospectionResult {
  active: boolean;
  sub: string;
  scope: string;
  exp: number;
  cjs_roles?: string[];
  cjs_status?: string;
  region?: string;
}

// ── PKCE helpers (alignés sur le SDK Node.js cjs_auth) ────────────────────

function randomBase64Url(byteLength: number): string {
  return randomBytes(byteLength)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function pkceChallenge(verifier: string): string {
  return createHash("sha256")
    .update(verifier)
    .digest("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// ── HMAC headers pour les appels server-to-server ─────────────────────────

function buildHmacHeaders(body: string): HeadersInit {
  if (!API_KEY || !API_SECRET) {
    throw new Error("SSO_API_KEY et SSO_API_SECRET sont requis pour les appels server-to-server");
  }
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const bodyHash = createHash("sha256").update(body).digest("hex");
  const message = `${API_KEY}\n${timestamp}\n${bodyHash}`;
  const signature = createHmac("sha256", API_SECRET)
    .update(message)
    .digest("hex");
  return {
    "X-CJS-Api-Key": API_KEY,
    "X-CJS-Timestamp": timestamp,
    "X-CJS-Signature": signature,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

// ── Flux OAuth PKCE ───────────────────────────────────────────────────────

/**
 * Génère l'URL d'autorisation SSO avec PKCE.
 * Stocker `state` et `pkceVerifier` dans des cookies httpOnly avant de rediriger.
 */
export function getAuthorizationUrl(scope = DEFAULT_SCOPE): {
  url: string;
  state: string;
  pkceVerifier: string;
} {
  const state = randomBase64Url(32);
  const pkceVerifier = randomBase64Url(43);
  const challenge = pkceChallenge(pkceVerifier);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: "code",
    scope,
    state,
    code_challenge: challenge,
    code_challenge_method: "S256",
  });

  return {
    url: `${SSO_BASE_URL}/oauth/authorize?${params}`,
    state,
    pkceVerifier,
  };
}

export async function exchangeCode(
  code: string,
  pkceVerifier: string,
): Promise<TokenResponse> {
  const res = await fetch(`${SSO_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      code,
      redirect_uri: REDIRECT_URI,
      code_verifier: pkceVerifier,
    }),
  });
  if (!res.ok) throw new Error(`SSO token exchange failed: ${res.status}`);
  return res.json();
}

export async function getUserInfo(accessToken: string): Promise<CJSClaims> {
  const res = await fetch(`${SSO_BASE_URL}/oauth/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`SSO userinfo failed: ${res.status}`);
  return res.json();
}

export async function refreshAccessToken(
  token: string,
): Promise<TokenResponse> {
  const res = await fetch(`${SSO_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      refresh_token: token,
    }),
  });
  if (!res.ok) throw new Error(`SSO refresh failed: ${res.status}`);
  return res.json();
}

export async function revokeToken(accessToken: string): Promise<void> {
  await fetch(`${SSO_BASE_URL}/oauth/token/revoke`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
    },
  });
}

// ── Server-to-server (HMAC) ───────────────────────────────────────────────

export async function verifyToken(
  token: string,
  includeClaims = false,
): Promise<IntrospectionResult> {
  const body = JSON.stringify({ token, include_claims: includeClaims });
  const res = await fetch(`${SSO_BASE_URL}/oauth/token/verify`, {
    method: "POST",
    headers: buildHmacHeaders(body),
    body,
  });
  if (!res.ok) throw new Error(`SSO token verify failed: ${res.status}`);
  return res.json();
}
