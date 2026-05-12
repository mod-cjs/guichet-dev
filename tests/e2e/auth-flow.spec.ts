/**
 * E2E — Flux PKCE complet (Playwright)
 *
 * Prérequis pour lancer ces tests :
 *   1. Démarrer le serveur SSO mock (port 19999) avant Next.js :
 *      SSO_BASE_URL=http://localhost:19999 NEXTAUTH_URL=http://localhost:3000 npm run dev
 *
 *   2. Lancer Playwright :
 *      npx playwright test tests/e2e/auth-flow.spec.ts
 *
 * Les tests "flux complet" sont skippés en CI par défaut (PLAYWRIGHT_SSO_MOCK=1 pour activer).
 */

import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const SSO_MOCK_ACTIVE = process.env.PLAYWRIGHT_SSO_MOCK === '1'

// ── Helpers ────────────────────────────────────────────────────────────────

async function setAuthCookies(
  context: BrowserContext,
  state: string,
  verifier: string,
): Promise<void> {
  await context.addCookies([
    {
      name:     'oauth_state',
      value:    state,
      domain:   'localhost',
      path:     '/',
      httpOnly: true,
      secure:   false,
    },
    {
      name:     'pkce_verifier',
      value:    verifier,
      domain:   'localhost',
      path:     '/',
      httpOnly: true,
      secure:   false,
    },
  ])
}

// ── Routes publiques ───────────────────────────────────────────────────────

test.describe('routes publiques', () => {
  test('la page d\'accueil est accessible sans auth', async ({ page }) => {
    await page.goto('/')
    await expect(page).not.toHaveURL(/auth\/connexion/)
  })

  test('/opportunites est accessible sans auth', async ({ page }) => {
    await page.goto('/opportunites')
    await expect(page).not.toHaveURL(/auth\/connexion/)
  })

  test('/auth/connexion affiche le formulaire de connexion', async ({ page }) => {
    await page.goto('/auth/connexion')
    await expect(page).toHaveURL(/auth\/connexion/)
  })
})

// ── Protection des routes ─────────────────────────────────────────────────

test.describe('protection des routes', () => {
  test('/jeune/tableau-de-bord redirige vers /auth/connexion sans session', async ({ page }) => {
    await page.goto('/jeune/tableau-de-bord')
    await expect(page).toHaveURL(/auth\/connexion/)
  })

  test('/admin/tableau-de-bord redirige vers /auth/connexion sans session', async ({ page }) => {
    await page.goto('/admin/tableau-de-bord')
    await expect(page).toHaveURL(/auth\/connexion/)
  })

  test('/recruteur/offres redirige vers /auth/connexion sans session', async ({ page }) => {
    await page.goto('/recruteur/offres')
    await expect(page).toHaveURL(/auth\/connexion/)
  })

  test('le cookie auth_return_to est posé lors de la redirection', async ({ page, context }) => {
    await page.goto('/jeune/profil')
    await expect(page).toHaveURL(/auth\/connexion/)

    const cookies = await context.cookies()
    const returnTo = cookies.find(c => c.name === 'auth_return_to')
    expect(returnTo).toBeDefined()
    expect(decodeURIComponent(returnTo!.value)).toContain('/jeune/profil')
  })
})

// ── Callback avec state invalide ───────────────────────────────────────────

test.describe('callback — état invalide', () => {
  test('callback sans cookies pkce/state redirige vers invalid_state', async ({ page }) => {
    await page.goto('/auth/callback?code=test-code&state=bad-state')
    await expect(page).toHaveURL(/error=invalid_state/)
  })

  test('callback avec state ne correspondant pas au cookie → invalid_state', async ({
    page,
    context,
  }) => {
    await setAuthCookies(context, 'expected-state', 'pkce-verifier-xyz')
    await page.goto('/auth/callback?code=test-code&state=wrong-state')
    await expect(page).toHaveURL(/error=invalid_state/)
  })
})

// ── Flux PKCE complet (nécessite le serveur SSO mock) ─────────────────────

test.describe('flux PKCE complet', () => {
  test.skip(!SSO_MOCK_ACTIVE, 'Activer avec PLAYWRIGHT_SSO_MOCK=1')

  test('clic Se connecter → SSO mock → callback → session créée → onboarding', async ({
    page,
    context,
  }) => {
    await page.goto('/auth/connexion')

    // Intercepter la navigation vers le SSO pour récupérer state + challenge
    let capturedState    = ''
    let capturedVerifier = ''

    page.on('request', req => {
      const url = req.url()
      if (url.includes('/oauth/authorize')) {
        const params = new URL(url)
        capturedState = params.searchParams.get('state') ?? ''
      }
    })

    // Cliquer sur le bouton de connexion SSO
    const connectBtn = page.getByRole('link', { name: /se connecter/i }).first()
    await connectBtn.click()

    // Le SSO mock reçoit /oauth/authorize et redirige vers /auth/callback?code=...&state=...
    // Attendre la redirection finale
    await page.waitForURL(/\/(jeune|admin|recruteur)\/|onboarding/, { timeout: 10_000 })

    // Vérifier qu'une session a été établie (cookies de session présents)
    const cookies = await context.cookies()
    const sessionCookie = cookies.find(c => c.name === 'cjs_session')
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie!.httpOnly).toBe(true)

    // Nouveau bénéficiaire → redirigé vers onboarding
    expect(page.url()).toContain('/jeune/onboarding')
  })

  test('callback avec SSO → auth_failed si SSO token exchange échoue', async ({
    page,
    context,
  }) => {
    // Placer des cookies valides mais le code sera rejeté par le mock SSO
    // (simulé en mettant une valeur de code qui force l'erreur côté mock)
    const state    = 'test-state-fail'
    const verifier = 'test-verifier-fail'
    await setAuthCookies(context, state, verifier)

    // Intercepter la requête /oauth/token et retourner une erreur
    await context.route('**/oauth/token', route => {
      route.fulfill({ status: 401, body: '{"error":"invalid_client"}' })
    })

    await page.goto(`/auth/callback?code=bad-code&state=${state}`)
    await expect(page).toHaveURL(/error=auth_failed/)
  })

  test('flux complet onboarding — 3 étapes', async ({ page }) => {
    // Naviguer vers l'onboarding (nécessite session valide établie par test précédent
    // ou injection de session via context)
    await page.goto('/auth/connexion')
    const connectBtn = page.getByRole('link', { name: /se connecter/i }).first()
    await connectBtn.click()

    await page.waitForURL(/onboarding/, { timeout: 10_000 })

    // Étape 1 — Identité
    const nomInput    = page.getByLabel(/nom/i)
    const prenomInput = page.getByLabel(/prénom/i)

    if (await nomInput.isVisible()) {
      await nomInput.fill('Diallo')
      await prenomInput.fill('Fatou')
      await page.getByRole('button', { name: /suivant|continuer/i }).click()
    }

    // Étape 2 — Localisation
    const regionSelect = page.getByLabel(/région/i)
    if (await regionSelect.isVisible()) {
      await regionSelect.selectOption({ index: 1 })
      await page.getByRole('button', { name: /suivant|continuer/i }).click()
    }

    // Étape 3 — Profil
    const niveauSelect = page.getByLabel(/niveau d'étude/i)
    if (await niveauSelect.isVisible()) {
      await niveauSelect.selectOption({ index: 1 })
      await page.getByRole('button', { name: /terminer|valider/i }).click()
    }

    // Après complétion → tableau de bord
    await expect(page).toHaveURL(/tableau-de-bord/, { timeout: 5_000 })
  })
})

// ── Session révoquée ───────────────────────────────────────────────────────

test.describe('session révoquée (backchannel logout)', () => {
  test('une route protégée avec cookie invalide redirige vers connexion', async ({
    page,
    context,
  }) => {
    // Injecter un cookie de session syntaxiquement valide mais non activé en Redis
    await context.addCookies([{
      name:     'cjs_session',
      value:    'invalid.jwt.token',
      domain:   'localhost',
      path:     '/',
      httpOnly: true,
      secure:   false,
    }])

    await page.goto('/jeune/tableau-de-bord')
    // Doit rediriger vers connexion (session invalide ou révoquée)
    await expect(page).toHaveURL(/auth\/connexion/)
  })
})
