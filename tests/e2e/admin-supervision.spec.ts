/**
 * GUIC-153 — Ad3 : candidatures côté admin = SUPERVISION (lecture seule).
 * Oracle §14 + invariant rôles : l'admin observe (stats/export), il ne DÉCIDE jamais.
 */

import { test, expect } from '@playwright/test'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('admin') })

test.describe('Ad3 — admin candidatures (lecture seule)', () => {
  test('supervision : export présent, ∅ tout bouton de décision', async ({ page }) => {
    await page.goto('/admin/candidatures')

    await expect(page.getByRole('heading', { name: 'Candidatures' })).toBeVisible()
    // Outils de supervision : export CSV.
    await expect(page.getByRole('link', { name: /exporter/i })).toBeVisible()

    // Invariant : AUCUN bouton de décision côté admin (la décision = recruteur).
    await expect(page.getByRole('button', { name: /^retenir$/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^refuser$/i })).toHaveCount(0)
    await expect(page.getByRole('button', { name: /^approuver$/i })).toHaveCount(0)
  })
})
