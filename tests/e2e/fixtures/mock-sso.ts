/**
 * Fixture Playwright — serveur SSO de test.
 *
 * Lance un serveur HTTP local qui simule les endpoints OAuth2/OIDC de CJS Auth :
 *   POST /oauth/token    → retourne des tokens fictifs
 *   GET  /oauth/userinfo → retourne les claims de l'utilisateur de test
 *   GET  /oauth/keys     → JWKS vide (pas de vérification de signature en E2E)
 *
 * Usage :
 *   SSO_BASE_URL=http://localhost:19999 NEXTAUTH_URL=http://localhost:3000 npx playwright test
 *
 * La variable SSO_BASE_URL DOIT pointer sur ce serveur au démarrage de Next.js.
 * Configurer playwright.config.ts avec :
 *   webServer: { command: 'SSO_BASE_URL=http://localhost:19999 npm run dev', ... }
 */

import * as http from 'http'
import type { AddressInfo } from 'net'

export interface MockSsoServer {
  url:     string
  claims:  MockClaims
  destroy: () => Promise<void>
}

export interface MockClaims {
  sub:          string
  given_name:   string
  family_name:  string
  email:        string
  phone_number: string | null
  cjs_roles:    string[]
  cjs_status:   string
}

export const DEFAULT_CLAIMS: MockClaims = {
  sub:          'e2e-uid-001',
  given_name:   'Fatou',
  family_name:  'Diallo',
  email:        'fatou.e2e@example.sn',
  phone_number: '+221770000001',
  cjs_roles:    ['beneficiaire'],
  cjs_status:   'active',
}

/**
 * GUIC-153 — Identités multi-rôles. Le rôle voyage du navigateur au serveur SANS modifier l'app :
 * cookie `e2e_role` lu à `/oauth/authorize` → encodé dans le `code` → réémis dans l'`access_token`
 * → décodé à `/oauth/userinfo` (appel serveur-à-serveur, hors du navigateur). Clés = E2E_UIDS.
 * Sans cookie → DEFAULT_CLAIMS (rétrocompat auth-flow / sso-flow / centres-*).
 */
export const ROLE_CLAIMS: Record<string, MockClaims> = {
  jeune:      { sub: 'e2e-jeune',      given_name: 'Awa',    family_name: 'Ndiaye', email: 'e2e-jeune@example.sn',      phone_number: '+221770000010', cjs_roles: ['beneficiaire'], cjs_status: 'active' },
  'jeune-onb':{ sub: 'e2e-jeune-onb',  given_name: 'Moussa', family_name: 'Sow',    email: 'e2e-jeune-onb@example.sn',  phone_number: '+221770000011', cjs_roles: ['beneficiaire'], cjs_status: 'active' },
  recruteur:  { sub: 'e2e-recruteur',  given_name: 'Bineta', family_name: 'Fall',   email: 'e2e-recruteur@example.sn',  phone_number: '+221770000012', cjs_roles: ['recruteur'],    cjs_status: 'active' },
  admin:      { sub: 'e2e-admin',      given_name: 'Ibrahima', family_name: 'Ba',   email: 'e2e-admin@example.sn',      phone_number: '+221770000013', cjs_roles: ['admin'],        cjs_status: 'active' },
  conseiller: { sub: 'e2e-conseiller', given_name: 'Sokhna', family_name: 'Diop',   email: 'e2e-conseiller@example.sn', phone_number: '+221770000014', cjs_roles: ['conseiller'],   cjs_status: 'active' },
}

/** Extrait la valeur d'un cookie depuis l'en-tête `Cookie` brut. */
function cookieValue(header: string | undefined, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return decodeURIComponent(v.join('='))
  }
  return null
}

/** Sépare un marqueur `base::role` (code ou access_token) → rôle ou null. */
function roleFromMarker(value: string | null | undefined): string | null {
  if (!value) return null
  const idx = value.indexOf('::')
  return idx === -1 ? null : value.slice(idx + 2)
}

/**
 * Claims pour une clé `e2e_role`. Rôle connu (ROLE_CLAIMS) → identité dédiée ; clé inconnue mais
 * présente → identité **bénéficiaire synthétique distincte** (`sub = e2e-<clé>`) — permet à chaque
 * spec d'avoir sa propre identité (donc sa propre session Redis / ligne DB) et de tourner en
 * PARALLÈLE sans se marcher dessus. Sans clé → identité par défaut du serveur.
 */
export function claimsForRole(role: string | null, fallback: MockClaims): MockClaims {
  if (!role) return fallback
  if (ROLE_CLAIMS[role]) return ROLE_CLAIMS[role]
  return {
    sub:          `e2e-${role}`,
    given_name:   'E2E',
    family_name:  role,
    email:        `e2e-${role}@example.sn`,
    phone_number: null,
    cjs_roles:    ['beneficiaire'],
    cjs_status:   'active',
  }
}

export function startMockSsoServer(
  port = 19999,
  claims: MockClaims = DEFAULT_CLAIMS,
): Promise<MockSsoServer> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json')

      if (req.method === 'POST' && req.url === '/oauth/token') {
        // GUIC-604 — le mock doit savoir simuler un ÉCHEC d'échange. L'échange se fait
        // SERVEUR-À-SERVEUR (Next → ici) : le test ne peut PAS l'intercepter depuis le
        // navigateur (`context.route` ne voit que le trafic du navigateur). Convention :
        // un code contenant « bad » → 401, comme un vrai SSO refusant un code invalide.
        let corps = ''
        req.on('data', (c) => { corps += c })
        req.on('end', () => {
          // Le vrai client SSO poste du JSON (cf. src/lib/sso-client.ts) ; on tolère aussi
          // le form-urlencoded pour rester fidèle à ce qu'un serveur OAuth accepte.
          let code = ''
          try {
            code = String((JSON.parse(corps) as { code?: unknown }).code ?? '')
          } catch {
            code = new URLSearchParams(corps).get('code') ?? ''
          }
          if (code.includes('bad')) {
            res.writeHead(401)
            res.end(JSON.stringify({ error: 'invalid_client' }))
            return
          }
          // Réémet le rôle porté par le code dans l'access_token (lu à /oauth/userinfo).
          const role = roleFromMarker(code)
          res.end(JSON.stringify({
            access_token:  'e2e-access-token' + (role ? `::${role}` : ''),
            refresh_token: 'e2e-refresh-token',
            id_token:      'e2e-id-token',
            expires_in:    3600,
            token_type:    'Bearer',
          }))
        })
        return
      }

      if (req.method === 'GET' && req.url === '/oauth/userinfo') {
        // Décode le rôle depuis le Bearer (appel serveur-à-serveur) → claims de l'identité.
        const role = roleFromMarker((req.headers.authorization ?? '').replace(/^Bearer\s+/i, ''))
        const c = claimsForRole(role, claims)
        res.end(JSON.stringify({
          ...c,
          name:                  `${c.given_name} ${c.family_name}`,
          email_verified:        true,
          phone_number_verified: false,
        }))
        return
      }

      if (req.method === 'GET' && req.url === '/oauth/keys') {
        res.end(JSON.stringify({ keys: [] }))
        return
      }

      // GUIC-604 — sonde de démarrage : Playwright attend cette URL avant de lancer les tests
      // (`webServer.url`). Sans elle, impossible d'orchestrer le mock comme process séparé.
      if (req.method === 'GET' && req.url === '/health') {
        res.end(JSON.stringify({ status: 'ok' }))
        return
      }

      // Endpoint d'autorisation — redirige vers le callback avec un code fictif
      if (req.method === 'GET' && req.url?.startsWith('/oauth/authorize')) {
        const params   = new URL(req.url, 'http://localhost').searchParams
        const state    = params.get('state') ?? ''
        const redirect = params.get('redirect_uri') ?? 'http://localhost:3000/auth/callback'
        const dest     = new URL(redirect)
        // Le rôle voyage via le cookie `e2e_role` (posé par auth.setup) → encodé dans le code.
        const role     = cookieValue(req.headers.cookie, 'e2e_role')
        dest.searchParams.set('code', 'e2e-auth-code' + (role ? `::${role}` : ''))
        dest.searchParams.set('state', state)
        res.writeHead(302, { Location: dest.toString() })
        res.end()
        return
      }

      res.writeHead(404)
      res.end('{"error":"not_found"}')
    })

    server.on('error', reject)

    server.listen(port, '127.0.0.1', () => {
      const addr = server.address() as AddressInfo
      resolve({
        url:     `http://127.0.0.1:${addr.port}`,
        claims,
        destroy: () => new Promise<void>((ok, ko) => server.close(e => e ? ko(e) : ok())),
      })
    })
  })
}
