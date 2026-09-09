/**
 * GUIC-153 — Ad9 : journal d'audit (admin, lecture).
 * Oracle §14 : /admin/journal-audit → « Journal d'audit » + traçabilité des actions sensibles.
 */

import { test, expect } from '@playwright/test'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('admin') })

test.afterAll(async () => { await disconnectPrisma() })

test.describe('Ad9 — journal d’audit admin @secondaire', () => {
  test('affiche le journal d’audit', async ({ page }) => {
    await page.goto('/admin/journal-audit')

    // Apostrophe typographique dans le titre → « . » matche ' ou '.
    await expect(page.getByRole('heading', { name: /journal d.audit/i }).first()).toBeVisible()
    await expect(page.getByText(/traçabilité des actions sensibles/i).first()).toBeVisible()
  })
})
