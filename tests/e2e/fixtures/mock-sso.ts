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

export function startMockSsoServer(
  port = 19999,
  claims: MockClaims = DEFAULT_CLAIMS,
): Promise<MockSsoServer> {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json')

      if (req.method === 'POST' && req.url === '/oauth/token') {
        res.end(JSON.stringify({
          access_token:  'e2e-access-token',
          refresh_token: 'e2e-refresh-token',
          id_token:      'e2e-id-token',
          expires_in:    3600,
          token_type:    'Bearer',
        }))
        return
      }

      if (req.method === 'GET' && req.url === '/oauth/userinfo') {
        res.end(JSON.stringify({
          ...claims,
          name:                  `${claims.given_name} ${claims.family_name}`,
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
        dest.searchParams.set('code', 'e2e-auth-code')
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
