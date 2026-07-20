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

import { test, expect, type BrowserContext } from '@playwright/test'
import { resetOnboardingState } from './_fixtures/utilisateur'
import { disconnectPrisma } from './_fixtures/prisma'

const SSO_MOCK_ACTIVE = process.env.PLAYWRIGHT_SSO_MOCK === '1'

/** `sub` fixe du SSO mock (cf. fixtures/mock-sso.ts > DEFAULT_CLAIMS). */
const MOCK_SUB = 'e2e-uid-001'

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

  // GUIC-616 — ces parcours partent d'un compte VIERGE. Le `sub` du mock est fixe et la ligne
  // `utilisateurs` survit au run : sans ce reset, ils ne passaient que sur une base fraîche
  // (2ᵉ passage → compte déjà onboardé → login direct sur le tableau de bord → rouge).
  test.beforeEach(async () => {
    await resetOnboardingState(MOCK_SUB)
  })

  test.afterAll(async () => {
    await disconnectPrisma()
  })

  test('clic Se connecter → SSO mock → callback → session créée → onboarding', async ({
    page,
    context,
  }) => {
    await page.goto('/auth/connexion')

    // Cliquer sur le bouton de connexion SSO
    // GUIC-604 — cibler le lien SSO par son CONTRAT (href), pas par un texte flou : il n'existe
    // aucun « Se connecter » sur /auth/connexion (le Header marketing n'y est pas monté), le
    // bouton s'appelle « Continuer avec mon compte CJS ». Le locator d'origine attendait 30 s
    // dans le vide — jamais vu, car ce test n'avait jamais été exécuté (toujours skippé).
    const connectBtn = page.locator('a[href="/api/auth/login"]')
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
    // Cookies valides, mais le code sera rejeté par le mock SSO : par convention, un code
    // contenant « bad » → 401 (cf. fixtures/mock-sso.ts).
    //
    // GUIC-604 — l'interception `context.route('**/oauth/token')` a été RETIRÉE : elle ne
    // pouvait pas fonctionner. L'échange de jetons est SERVEUR-À-SERVEUR (Next → mock) ;
    // `context.route` n'intercepte que le trafic du NAVIGATEUR. C'est le mock qui doit
    // simuler l'échec.
    const state    = 'test-state-fail'
    const verifier = 'test-verifier-fail'
    await setAuthCookies(context, state, verifier)

    await page.goto(`/auth/callback?code=bad-code&state=${state}`)
    await expect(page).toHaveURL(/error=auth_failed/)
  })

  test("flux complet onboarding — jusqu'au tableau de bord", async ({ page }) => {
    // GUIC-616 — Test entièrement réécrit. L'ancien supposait « identité → localisation →
    // profil » (3 étapes) : l'onboarding RÉEL en compte 4 (objectifs → profil →
    // centre-principal → recommandations) et commence par un choix d'objectifs, pas par des
    // champs nom/prénom. Il restait donc bloqué sur /jeune/onboarding/objectifs. Jamais vu :
    // ce test était skippé depuis sa création.
    //
    // On teste l'INTENTION (un nouveau compte traverse l'onboarding et atteint le tableau de
    // bord) sans coder en dur le nombre d'étapes ni leur contenu — ce qui le rend robuste aux
    // évolutions de l'onboarding, tout en gardant sa valeur d'anti-régression.
    await page.goto('/auth/connexion')
    await page.locator('a[href="/api/auth/login"]').click()
    await page.waitForURL(/onboarding/, { timeout: 10_000 })

    const visible = (re: RegExp) =>
      page.getByRole('button', { name: re }).filter({ visible: true }).first()

    for (let i = 0; i < 8; i++) {
      if (/tableau-de-bord/.test(page.url())) break

      // Étape « profil » : OBLIGATOIRE (pas de « Passer »), champs requis — cf. GUIC-442
      // (date de naissance + genre). On la remplit ; les autres étapes se passent.
      if (/onboarding\/profil/.test(page.url())) {
        // NB : la page rend les variantes MOBILE et DESKTOP → chaque label existe en double.
        // On ne cible que l'exemplaire VISIBLE (sinon « strict mode violation »).
        const champ = (label: string | RegExp) => page.getByLabel(label).filter({ visible: true }).first()
        await page.getByRole('button', { name: /^femme$/i }).filter({ visible: true }).first().click()
        await champ('Jour').selectOption({ index: 1 })
        await champ('Mois').selectOption({ index: 1 })
        await champ('Année').selectOption({ index: 1 })
        await page.getByRole('button', { name: /^dakar$/i }).filter({ visible: true }).first().click()
        await page.waitForTimeout(300)
        await champ(/niveau d'études/i).selectOption({ index: 1 })
        await page.waitForTimeout(300)
      }

      // « Passer » quand l'étape est facultative, sinon l'action d'avancement.
      const passer = visible(/passer/i)
      const avancer = visible(/continuer|suivant|terminer|valider|commencer|découvrir|aller (à mon espace|au tableau de bord)/i)

      if (await avancer.count() && (await avancer.isEnabled())) {
        await avancer.click()
      } else if (await passer.count()) {
        await passer.click()
      } else {
        break // aucune action disponible : l'assertion finale tranchera
      }
      await page.waitForTimeout(800)
    }

    await expect(page).toHaveURL(/tableau-de-bord/, { timeout: 10_000 })
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
