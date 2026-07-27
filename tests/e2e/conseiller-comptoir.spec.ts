/**
 * GUIC-153 — C4 : bibliothèque comptoir conseiller (lecture, état initial).
 * Oracle §14 : /conseiller/bibliotheque/comptoir → « Comptoir » + scan de la carte du jeune.
 */

import { test, expect } from '@playwright/test'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('conseiller') })

test.afterAll(async () => { await disconnectPrisma() })

test.describe('C4 — comptoir bibliothèque conseiller @secondaire', () => {
  test('affiche le comptoir et le scan de carte', async ({ page }) => {
    await page.goto('/conseiller/bibliotheque/comptoir')

    await expect(page.getByRole('heading', { name: /^comptoir$/i }).first()).toBeVisible()
    await expect(page.getByText(/scanner la carte du jeune/i).first()).toBeVisible()
  })
})
