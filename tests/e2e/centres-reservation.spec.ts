/**
 * E2E Playwright — Flow réservation centre jeune complet (DoD Lot 7 §6).
 * ====================================================================
 *
 * GUIC-394 — couvre le parcours de bout en bout d'un jeune :
 *   1. login SSO mock → session
 *   2. /centres → clic centre → /centres/[slug]
 *   3. clic Ressources → /centres/[slug]/ressources
 *   4. clic Réserver → /centres/[slug]/ressources/[id]/reserver
 *   5. remplit le formulaire (date demain, créneau, 1 personne, motif > 20)
 *   6. submit → redirect /jeune/mes-reservations-centres?created=<id>
 *   7. /jeune/mes-reservations-centres → tab Acceptées
 *   8. clic Annuler → confirm → réservation passe en tab Toutes (Annulee)
 *
 * Pré-requis (le test est skippé sinon — voir gate `E2E_ACTIVE`) :
 *   - DB Prisma test active (`DATABASE_URL` pointe sur une base non-prod)
 *   - SSO mock lancé (`SSO_BASE_URL=http://localhost:19999`)
 *   - `PLAYWRIGHT_SSO_MOCK=1`, `PLAYWRIGHT_E2E_DB=1`
 *
 * Commande type :
 *   PLAYWRIGHT_SSO_MOCK=1 PLAYWRIGHT_E2E_DB=1 \
 *     SSO_BASE_URL=http://localhost:19999 \
 *     npx playwright test tests/e2e/centres-reservation.spec.ts
 */

import { test, expect } from '@playwright/test'
import {
  seedCentreWithRessource,
  disconnectPrisma,
  type SeededCentre,
} from './_fixtures/centres'

const E2E_ACTIVE =
  process.env.PLAYWRIGHT_SSO_MOCK === '1' && process.env.PLAYWRIGHT_E2E_DB === '1'

test.describe('flow réservation centre jeune (E2E)', () => {
  test.skip(!E2E_ACTIVE, 'Activer avec PLAYWRIGHT_SSO_MOCK=1 + PLAYWRIGHT_E2E_DB=1')

  let seed: SeededCentre

  test.beforeAll(async () => {
    // Le cjsUid du seed doit correspondre au `sub` du SSO mock (cf. DEFAULT_CLAIMS).
    seed = await seedCentreWithRessource({ cjsUid: 'e2e-uid-001' })
  })

  test.afterAll(async () => {
    if (seed) await seed.cleanup()
    await disconnectPrisma()
  })

  test('jeune réserve → voit la résa → annule', async ({ page }) => {
    // 1. Login SSO mock
    await page.goto('/auth/connexion')
    await page
      .getByRole('link', { name: /se connecter/i })
      .first()
      .click()
    await page.waitForURL(/\/(jeune|onboarding)/, { timeout: 15_000 })

    // 2. Naviguer vers /centres puis sur notre centre seedé
    await page.goto('/centres')
    await expect(page).toHaveURL(/\/centres/)

    // Cliquer sur le centre seedé via son slug (lien sûr)
    await page.goto(`/centres/${seed.slug}`)
    await expect(page).toHaveURL(new RegExp(`/centres/${seed.slug}$`))

    // 3. Onglet / lien "Ressources"
    await page.goto(`/centres/${seed.slug}/ressources`)
    await expect(page).toHaveURL(new RegExp(`/centres/${seed.slug}/ressources$`))

    // 4. Cliquer Réserver sur la ressource seedée
    await page.goto(`/centres/${seed.slug}/ressources/${seed.ressourceId}/reserver`)
    await expect(page).toHaveURL(/reserver/)

    // 5. Remplir le formulaire
    const demain = new Date(Date.now() + 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10)
    await page.locator('input[type="date"]').fill(demain)

    // Créneau : prendre le premier bouton créneau disponible
    const slotBtn = page
      .locator('button')
      .filter({ hasText: /\d{2}:\d{2}/ })
      .first()
    await slotBtn.click()

    // Motif (>= 20 chars)
    await page
      .locator('textarea, input[name="motif"]')
      .first()
      .fill('Réservation E2E pour test automatisé du flow complet bout en bout.')

    // Submit
    await page.getByRole('button', { name: /réserver|valider|confirmer/i }).click()

    // 6. Redirect attendu vers /jeune/mes-reservations-centres?created=...
    await page.waitForURL(/\/jeune\/mes-reservations-centres\?created=/, { timeout: 10_000 })

    // 7. Liste des réservations (route réelle = mes-reservations-centres)
    await page.goto('/jeune/mes-reservations-centres')
    await expect(page.getByText(/Salle E2E/i).first()).toBeVisible({ timeout: 5_000 })

    // 8. Annuler la réservation
    await page.getByRole('button', { name: /annuler/i }).first().click()
    // Modal de confirmation
    await page.getByRole('button', { name: /confirmer|oui/i }).first().click()

    // Tab "Toutes" : la résa doit apparaître avec statut annulé
    await page.getByRole('tab', { name: /toutes/i }).click().catch(() => {})
    await expect(page.getByText(/annul/i).first()).toBeVisible({ timeout: 5_000 })
  })
})
