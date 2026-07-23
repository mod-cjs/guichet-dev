import { defineConfig, devices } from '@playwright/test'

/**
 * GUIC-604 — Orchestration des E2E.
 *
 * DEUX serveurs sont nécessaires pour les parcours métier complets :
 *   1. le SSO mock (process séparé, port 19999) — sans lui, le flux OAuth/PKCE ne peut pas jouer ;
 *   2. l'app Next, POINTÉE sur ce mock (`SSO_BASE_URL`).
 *
 * Les secrets ci-dessous doivent être IDENTIQUES entre le process Playwright (qui signe les
 * cookies staff / jetons QR dans les fixtures) et le serveur Next (qui les vérifie). On les lit
 * donc depuis l'environnement, avec un repli de dev — et on les repasse explicitement au
 * webServer pour qu'il ne dépende pas d'un `.env.local` local.
 */
const MOCK_SSO_PORT = process.env.MOCK_SSO_PORT ?? '19999'
const SSO_BASE_URL = `http://localhost:${MOCK_SSO_PORT}`

// GUIC-153 — port de l'app E2E paramétrable : évite de réutiliser un serveur étranger déjà sur
// :3000 (autre projet), ce qui produisait des 404 sur toutes nos routes. Lancer avec
// PLAYWRIGHT_APP_PORT=3100 pour un port dédié sans conflit inter-sessions.
const APP_PORT = process.env.PLAYWRIGHT_APP_PORT ?? '3000'
const APP_URL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${APP_PORT}`

/** Secrets partagés Playwright ↔ Next (repli de dev si non fournis par la CI). */
const SHARED_SECRETS = {
  SESSION_SECRET: process.env.SESSION_SECRET ?? 'e2e_session_secret',
  NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ?? 'e2e_session_secret',
  STAFF_SESSION_SECRET: process.env.STAFF_SESSION_SECRET ?? 'e2e-staff-secret',
  JWT_CJS_CARD_SECRET: process.env.JWT_CJS_CARD_SECRET ?? 'e2e-card-secret',
  CONSEILLER_STAFF_EMAILS: process.env.CONSEILLER_STAFF_EMAILS ?? 'staff.e2e@cjs.sn',
}

export default defineConfig({
  testDir: './tests/e2e',
  // GUIC-153 — seed du graphe stable (rattachements) avant tout test.
  globalSetup: './tests/e2e/global-setup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  // En CI on ajoute le rapport JSON : le garde-fou « zéro skip » du job le parse (parser le
  // rapport HTML serait fragile — c'est une SPA avec des données encodées).
  reporter: process.env.CI
    ? [['html'], ['json', { outputFile: 'playwright-results.json' }]]
    : 'html',
  use: {
    baseURL: APP_URL,
    trace: 'on-first-retry',
  },
  projects: [
    // GUIC-153 — projet `setup` : login par rôle → storageState (login une seule fois).
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }, dependencies: ['setup'] },
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] }, dependencies: ['setup'] },
  ],
  webServer: [
    {
      // 1. SSO mock — DOIT être prêt avant Next (qui le contacte au callback).
      command: `npx tsx tests/e2e/fixtures/run-mock-sso.ts`,
      url: `${SSO_BASE_URL}/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30_000,
      env: { MOCK_SSO_PORT },
    },
    {
      // 2. App Next, pointée sur le mock. En CI on sert le BUILD DE PROD (plus représentatif
      //    qu'un `next dev`) : le job construit d'abord, puis PLAYWRIGHT_WEBSERVER_CMD=npm run start.
      command: process.env.PLAYWRIGHT_WEBSERVER_CMD ?? `npm run dev -- -p ${APP_PORT}`,
      url: APP_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...SHARED_SECRETS,
        PORT: APP_PORT,
        SSO_BASE_URL,
        NEXTAUTH_URL: APP_URL,
        SSO_CLIENT_ID: process.env.SSO_CLIENT_ID ?? 'guichet-e2e',
        SSO_CLIENT_SECRET: process.env.SSO_CLIENT_SECRET ?? 'test',
      },
    },
  ],
})
