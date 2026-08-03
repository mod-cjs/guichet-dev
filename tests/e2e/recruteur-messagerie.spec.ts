/**
 * GUIC-153 — R6 : messagerie recruteur (état vide).
 * Oracle §14 : /recruteur/messagerie → « Messagerie » + « Aucune conversation. » (aucune seedée).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'
import { E2E_UIDS } from './_fixtures/seed-e2e'

test.use({ storageState: storageStatePath('recruteur') })

test.beforeAll(async () => {
  // Garantit l'état vide : purge toute conversation du recruteur (ex. résiduelle de R2).
  await getPrisma().conversation.deleteMany({ where: { recruteurUid: E2E_UIDS.recruteur } }).catch(() => {})
})

test.afterAll(async () => { await disconnectPrisma() })

test.describe('R6 — messagerie recruteur @secondaire', () => {
  test('état vide : aucune conversation', async ({ page }) => {
    await page.goto('/recruteur/messagerie')

    await expect(page.getByRole('heading', { name: /^messagerie$/i }).first()).toBeVisible()
    await expect(page.getByText(/aucune conversation/i).first()).toBeVisible()
  })
})
