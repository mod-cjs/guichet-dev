/**
 * GUIC-153 — J8 : ma carte CJS (jeune, lecture).
 * Oracle §14 : /jeune/ma-carte → carte (membre actif, matricule, QR) + carte retournable.
 */

import { test, expect } from '@playwright/test'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('jeune') })

test.afterAll(async () => { await disconnectPrisma() })

test.describe('J8 — ma carte CJS @secondaire', () => {
  test('affiche la carte CJS du jeune', async ({ page }) => {
    await page.goto('/jeune/ma-carte')

    await expect(page.getByRole('heading', { name: /ma carte cjs/i }).first()).toBeVisible()
    await expect(page.getByText(/membre actif/i).first()).toBeVisible()
    // Carte retournable (recto/verso).
    await expect(page.getByRole('button', { name: /voir le dos de la carte/i }).first()).toBeVisible()
    // Section usages.
    await expect(page.getByRole('heading', { name: /tes derniers usages/i }).first()).toBeVisible()
  })
})
