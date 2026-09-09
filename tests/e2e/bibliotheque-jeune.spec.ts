/**
 * GUIC-153 — J7 : bibliothèque jeune (lecture).
 * Oracle §14 : /jeune/bibliotheque → titre + formulaire de recherche (livres du catalogue).
 */

import { test, expect } from '@playwright/test'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('jeune') })

test.afterAll(async () => { await disconnectPrisma() })

test.describe('J7 — bibliothèque jeune @secondaire', () => {
  test('affiche la bibliothèque et la recherche', async ({ page }) => {
    await page.goto('/jeune/bibliotheque')

    await expect(page.getByRole('heading', { name: /^bibliothèque$/i }).first()).toBeVisible()
    await expect(page.locator('#biblio-q')).toBeVisible()
    await expect(page.getByRole('button', { name: /^rechercher$/i }).first()).toBeVisible()
  })
})
