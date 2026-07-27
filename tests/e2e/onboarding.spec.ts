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
  test('4 étapes → tableau de bord + onboardingComplete', async ({ page }, testInfo) => {
    // Oracle onboarding DESKTOP (grain fin). Le DOM mobile de l'onboarding est distinct ;
    // sa couverture est assurée par auth-flow › « flux complet onboarding » (boucle générique,
    // verte sur Mobile Chrome). On évite donc un double maintien fragile ici.
    test.skip(testInfo.project.name.includes('Mobile'), 'onboarding mobile couvert par auth-flow')
    // Viewport-agnostique : la page rend les variantes MOBILE et WEB simultanément (double DOM).
    // On ne cible QUE l'exemplaire VISIBLE → le test tient sur desktop ET mobile.
    const vis = (loc: import('@playwright/test').Locator) => loc.filter({ visible: true }).first()
    const champ = (label: string | RegExp) => vis(page.getByLabel(label))

    // Écran 1 — objectifs (redirigé depuis /jeune/onboarding).
    await page.goto('/jeune/onboarding')
    await page.waitForURL(/\/jeune\/onboarding\/objectifs/)
    await vis(page.getByRole('button', { name: /trouver un emploi/i })).click()
    await vis(page.getByRole('button', { name: /^continuer$/i })).click()

    // Écran 2 — profil.
    await page.waitForURL(/\/jeune\/onboarding\/profil/)
    await champ('Prénom').fill('Moussa')
    await champ('Nom').fill('Sow')
    await champ('Jour').selectOption({ index: 1 })
    await champ('Mois').selectOption({ index: 1 })
    await champ('Année').selectOption({ index: 1 })
    await vis(page.getByRole('button', { name: /^homme$/i })).click()
    await vis(page.getByRole('button', { name: /^dakar$/i })).click()
    await vis(page.getByRole('button', { name: /^continuer$/i })).click()

    // Écran 3 — centre principal (pré-sélectionné) → continuer.
    await page.waitForURL(/\/jeune\/onboarding\/centre-principal/)
    await vis(page.getByRole('button', { name: /^continuer$/i })).click()

    // Écran 4 — recommandations → finaliser (libellé diffère mobile/web).
    await page.waitForURL(/\/jeune\/onboarding\/recommandations/)
    await vis(page.getByRole('button', { name: /aller à (mon espace|au tableau de bord)/i })).click()

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
