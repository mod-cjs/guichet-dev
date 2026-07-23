/**
 * GUIC-153 — @smoke A2 : onboarding complet (jeune).
 * Oracle §13 : objectifs → profil → centre-principal → recommandations → onboardingComplete=true.
 * Double DOM mobile/web → on scope `.gj-onboarding-web` (viewport desktop).
 */

import { test, expect } from '@playwright/test'
import { resetOnboardingState } from './_fixtures/utilisateur'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'
import { E2E_UIDS } from './_fixtures/seed-e2e'

test.use({ storageState: storageStatePath('jeune-onb') })

test.beforeAll(async () => {
  // Ré-exécutable : repasse le compte en onboarding non terminé + purge le profil.
  await resetOnboardingState(E2E_UIDS.jeuneOnb)
  await getPrisma().profilJeune.deleteMany({ where: { cjsUid: E2E_UIDS.jeuneOnb } }).catch(() => {})
})

test.afterAll(async () => {
  await disconnectPrisma()
})

test.describe('A2 — onboarding complet @smoke', () => {
  test('4 étapes → tableau de bord + onboardingComplete', async ({ page }) => {
    const web = page.locator('.gj-onboarding-web')

    // Écran 1 — objectifs (redirigé depuis /jeune/onboarding).
    await page.goto('/jeune/onboarding')
    await page.waitForURL(/\/jeune\/onboarding\/objectifs/)
    await web.getByRole('button', { name: /trouver un emploi/i }).click()
    await web.getByRole('button', { name: /^continuer$/i }).click()

    // Écran 2 — profil.
    await page.waitForURL(/\/jeune\/onboarding\/profil/)
    await page.locator('#web-prenom').fill('Moussa')
    await page.locator('#web-nom').fill('Sow')
    await page.locator('#web-dn-jour').selectOption({ index: 1 })
    await page.locator('#web-dn-mois').selectOption({ index: 1 })
    await page.locator('#web-dn-annee').selectOption({ index: 1 })
    await web.locator('#web-genre-group').getByRole('button', { name: /homme/i }).first().click()
    await web.locator('#web-region-group').getByRole('button', { name: /dakar/i }).first().click()
    await web.getByRole('button', { name: /^continuer$/i }).click()

    // Écran 3 — centre principal (pré-sélectionné) → continuer.
    await page.waitForURL(/\/jeune\/onboarding\/centre-principal/)
    await web.getByRole('button', { name: /^continuer$/i }).click()

    // Écran 4 — recommandations → finaliser.
    await page.waitForURL(/\/jeune\/onboarding\/recommandations/)
    await web.getByRole('button', { name: /aller à mon espace/i }).click()

    // Atterrissage + état final DB.
    await page.waitForURL(/\/jeune\/tableau-de-bord/)
    await expect
      .poll(async () => {
        const u = await getPrisma().utilisateur.findUnique({
          where: { cjsUid: E2E_UIDS.jeuneOnb },
          select: { onboardingComplete: true },
        })
        return u?.onboardingComplete
      }, { timeout: 8000 })
      .toBe(true)
  })
})
