/**
 * GUIC-153 — J9 : messagerie jeune (état vide).
 * Oracle §14 : /jeune/messagerie → « Messagerie » + « Aucune conversation. » (aucune seedée).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'
import { E2E_UIDS } from './_fixtures/seed-e2e'

test.use({ storageState: storageStatePath('jeune') })

test.beforeAll(async () => {
  await getPrisma().conversation.deleteMany({ where: { candidatUid: E2E_UIDS.jeune } }).catch(() => {})
})

test.afterAll(async () => { await disconnectPrisma() })

test.describe('J9 — messagerie jeune @secondaire', () => {
  test('état vide : aucune conversation', async ({ page }) => {
    await page.goto('/jeune/messagerie')

    await expect(page.getByRole('heading', { name: /^messagerie$/i }).first()).toBeVisible()
    await expect(page.getByText(/aucune conversation/i).first()).toBeVisible()
  })
})
