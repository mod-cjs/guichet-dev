/**
 * GUIC-153 — Ad10 : data-hub / statistiques admin (lecture — assert rendu, pas exactitude).
 * Oracle §14 : /admin/data-hub → « Statistiques & rapports » + cartes de stats + exports.
 */

import { test, expect } from '@playwright/test'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('admin') })

test.afterAll(async () => { await disconnectPrisma() })

test.describe('Ad10 — data-hub admin @secondaire', () => {
  test('affiche les statistiques et les exports', async ({ page }) => {
    await page.goto('/admin/data-hub')

    await expect(page.getByRole('heading', { name: /statistiques.*rapports/i }).first()).toBeVisible()
    // Cartes de stats (assert rendu, pas l'exactitude des chiffres).
    await expect(page.getByRole('heading', { name: /inscriptions cumulées/i }).first()).toBeVisible()
    // Lien d'export.
    await expect(page.getByRole('link', { name: /utilisateurs/i }).first()).toBeVisible()
  })
})
