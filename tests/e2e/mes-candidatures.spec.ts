/**
 * GUIC-153 — J3 : suivi de mes candidatures (jeune).
 * Oracle §14 : /jeune/mes-candidatures → compteur dossiers + carte avec pill de statut.
 */

import { test, expect } from '@playwright/test'
import { seedOpportunite, seedCandidature, combineCleanups, E2E_UIDS } from './_fixtures/seed-e2e'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('jeune') })

let cleanup: (() => Promise<void>) | undefined
const TITRE = 'Opportunité E2E J3 suivi'

test.beforeAll(async () => {
  const o = await seedOpportunite({ slug: 'e2e-j3-suivi', titre: TITRE, statut: 'publiee' })
  const c = await seedCandidature({ cjsUid: E2E_UIDS.jeune, opportuniteId: o.id, statut: 'En_attente' })
  cleanup = combineCleanups(o.cleanup, c.cleanup)
})

test.afterAll(async () => {
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('J3 — suivi des candidatures @secondaire', () => {
  test('la candidature apparaît avec son statut', async ({ page }) => {
    await page.goto('/jeune/mes-candidatures')

    await expect(page.getByRole('heading', { name: 'Mes candidatures' })).toBeVisible()
    // Compteur : au moins 1 dossier.
    await expect(page.getByTestId('candidatures-counter')).not.toContainText(/^0 /)

    // La carte de notre candidature (En_attente → pill « Envoyée »).
    const carte = page.locator('[data-testid="candidatures-list"] article').filter({ hasText: TITRE }).first()
    await expect(carte).toBeVisible()
    await expect(carte.getByTestId('candidature-status-pill')).toContainText(/envoyée/i)
  })
})
