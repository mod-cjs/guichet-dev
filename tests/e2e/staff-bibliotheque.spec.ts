/**
 * GUIC-153 — S3 : bibliothèque centre-staff (lecture).
 * Oracle §14 : /centre-staff/bibliotheque → « Bibliothèque » + onglets À confirmer / À rendre.
 */

import { test, expect } from '@playwright/test'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('staff') })

test.afterAll(async () => { await disconnectPrisma() })

test.describe('S3 — bibliothèque centre-staff @secondaire', () => {
  test('affiche la gestion des emprunts', async ({ page }) => {
    await page.goto('/centre-staff/bibliotheque')

    await expect(page.getByRole('heading', { name: /^bibliothèque$/i }).first()).toBeVisible()
    await expect(page.getByText(/gestion des emprunts du centre/i).first()).toBeVisible()
    await expect(page.getByRole('tab', { name: /à confirmer/i }).first()).toBeVisible()
  })
})
