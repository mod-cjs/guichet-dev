/**
 * E2E — Flow SSO complet (anti-régression GUIC-259)
 * ====================================================================
 *
 * Ces tests décrivent le comportement utilisateur attendu du flow SSO
 * de bout en bout et servent de **garde-fou anti-régression** contre
 * GUIC-259 (bug de boucle login post-SSO causé par un cookie
 * `cjs_session` posé en `sameSite=Strict`).
 *
 * Histoire du bug (cf. commit e0f6f51) :
 *   - GUIC-218 (Wave 6 sécu CDP) avait repassé `cjs_session` en
 *     `sameSite=Strict`, annulant le fix GUIC-18 qui l'avait mis en
 *     `Lax` pour compatibilité OAuth.
 *   - Effet : après le callback SSO (initiateur cross-site), le
 *     navigateur **refusait** le cookie sur le hop suivant
 *     (`/jeune/tableau-de-bord`), et le middleware renvoyait vers
 *     `/auth/connexion` → boucle infinie.
 *   - GUIC-259 a corrigé en repassant `cjs_session` en
 *     `sameSite=Lax`.
 *
 * Ces tests **doivent rester verts** ; si l'un d'eux échoue parce que
 * `cjs_session` repasse en `Strict`, alors la régression GUIC-259 est
 * réintroduite — **NE PAS** silencer ces tests, corriger la source.
 *
 * Tests inclus :
 *   1. login → callback → /jeune/tableau-de-bord (PAS de boucle)
 *   2. cookie `cjs_session` a `sameSite=Lax` (anti-régression GUIC-259)
 *   3. déconnexion supprime le cookie
 *   4. session expirée redirige sur /auth/connexion
 *
 * Setup :
 *   Les tests qui ont besoin d'une session SSO réussie sont gatés sur
 *   `PLAYWRIGHT_SSO_MOCK=1` car ils requièrent :
 *     - un serveur SSO mock (cf. `fixtures/mock-sso.ts`)
 *     - DB Prisma (`utilisateur.upsert` dans /auth/callback)
 *     - Redis (`saveTokens` + révocation)
 *
 *   Commande complète :
 *     PLAYWRIGHT_SSO_MOCK=1 \
 *     SSO_BASE_URL=http://localhost:19999 \
 *     NEXTAUTH_URL=http://localhost:3000 \
 *     npm run test:e2e -- tests/e2e/sso-flow.spec.ts
 *
 *   Voir `docs/e2e-tests.md` pour le détail.
 */

import { test, expect, type BrowserContext } from '@playwright/test'

const SSO_MOCK_ACTIVE = process.env.PLAYWRIGHT_SSO_MOCK === '1'

// GUIC-604 — Le mock SSO n'est PLUS démarré ici : il l'est par `playwright.config.ts`
// (webServer `run-mock-sso.ts`, port 19999), AVANT tout test et pour TOUS les specs.
//
// Pourquoi ce changement : ce fichier démarrait le mock dans un `beforeAll`, et `auth-flow`
// (flux PKCE) en dépendait SANS le démarrer → dépendance cachée entre fichiers, et une COURSE
// avec `fullyParallel: true` (auth-flow pouvait s'exécuter avant ce beforeAll). Un seul
// propriétaire du cycle de vie = déterministe.

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Effectue le flow SSO complet : clic Se connecter → mock SSO → callback.
 * Nécessite `PLAYWRIGHT_SSO_MOCK=1` + DB Prisma + Redis.
 */
async function performSsoLogin(context: BrowserContext): Promise<void> {
  const page = await context.newPage()
  await page.goto('/auth/connexion')
  await page.getByRole('link', { name: /continuer avec mon compte cjs/i }).click()
  await page.waitForURL(/\/(jeune|admin|recruteur)\//, { timeout: 10_000 })
  await page.close()
}

// ── Tests ───────────────────────────────────────────────────────────────

// GUIC-604 — `.serial` : ces tests PARTAGENT un état (session SSO du même utilisateur mock,
// cookie `cjs_session`, tokens Redis). En parallèle ils se marchent dessus — vérifié : 2 échecs
// aléatoires en `fullyParallel`, 4/4 en série. La CI met `workers: 1`, ce qui les faisait passer
// PAR CHANCE ; `.serial` rend la contrainte explicite et sûre quel que soit le nombre de workers.
test.describe.serial('Flow SSO complet (anti-régression GUIC-259)', () => {

  // GUIC-153 — identité DÉDIÉE : le logout de ces tests révoque la session Redis ; sans identité
  // propre il annulait celle d'autres specs en full-parallel. Cookie e2e_role → sub `e2e-ssoflow`.
  test.beforeEach(async ({ context }) => {
    await context.addCookies([{ name: 'e2e_role', value: 'ssoflow', domain: 'localhost', path: '/' }])
  })

  test('login → callback → /jeune/tableau-de-bord (PAS de boucle)', async ({ context, page }) => {
    test.skip(!SSO_MOCK_ACTIVE, 'Activer avec PLAYWRIGHT_SSO_MOCK=1')

    await page.goto('/auth/connexion')
    await page.getByRole('link', { name: /continuer avec mon compte cjs/i }).click()

    // Attendre l'arrivée sur une zone connectée jeune (tableau-de-bord ou onboarding)
    await page.waitForURL(/\/jeune\/(tableau-de-bord|onboarding)/, { timeout: 10_000 })

    // Anti-régression GUIC-259 : on ne doit JAMAIS revenir sur /auth/connexion
    await expect(page).not.toHaveURL(/\/auth\/connexion/)

    // Un cookie de session doit être présent
    const cookies = await context.cookies()
    expect(cookies.find(c => c.name === 'cjs_session')).toBeDefined()
  })

  test('cookie cjs_session a sameSite=Lax (anti-régression GUIC-259)', async ({ context }) => {
    test.skip(!SSO_MOCK_ACTIVE, 'Activer avec PLAYWRIGHT_SSO_MOCK=1')

    await performSsoLogin(context)

    const cookies = await context.cookies()
    const session = cookies.find(c => c.name === 'cjs_session')

    expect(session, 'cookie cjs_session doit être posé après le callback SSO').toBeDefined()

    // ⚠️ GARDE-FOU GUIC-259 — NE PAS MODIFIER cette assertion.
    // Le cookie cjs_session DOIT être sameSite=Lax (et surtout PAS Strict).
    // Strict casse le flow OAuth (cf. commit e0f6f51 et historique GUIC-218/259).
    expect(session!.sameSite).toBe('Lax')
    expect(session!.sameSite).not.toBe('Strict')

    // Garde-fous CDP additionnels
    expect(session!.httpOnly).toBe(true)
  })

  test('déconnexion supprime le cookie cjs_session', async ({ context, page }) => {
    test.skip(!SSO_MOCK_ACTIVE, 'Activer avec PLAYWRIGHT_SSO_MOCK=1')

    await performSsoLogin(context)

    // Vérifier la pré-condition : cookie présent
    let cookies = await context.cookies()
    expect(cookies.find(c => c.name === 'cjs_session')).toBeDefined()

    // Logout — POST /api/auth/logout (CSRF-protégé via Origin/Referer du Guichet)
    await page.goto('/')
    const baseURL = page.url()
    await page.request.post('/api/auth/logout', {
      headers: { Referer: baseURL, Origin: new URL(baseURL).origin },
      maxRedirects: 0,
      failOnStatusCode: false,
    })

    cookies = await context.cookies()
    expect(cookies.find(c => c.name === 'cjs_session')).toBeUndefined()
  })

  test('session expirée redirige sur /auth/connexion', async ({ context, page }) => {
    // Pas besoin du mock SSO — on injecte un cookie session pourri et on
    // vérifie le comportement du middleware : route protégée + cookie
    // invalide → /auth/connexion (jamais de boucle, jamais de 500).
    await context.addCookies([{
      name:     'cjs_session',
      value:    'expired.invalid.jwt',
      domain:   'localhost',
      path:     '/',
      httpOnly: true,
      secure:   false,
      sameSite: 'Lax',
    }])

    await page.goto('/jeune/tableau-de-bord')
    await expect(page).toHaveURL(/\/auth\/connexion/)
  })
})
