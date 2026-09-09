/**
 * GUIC-153 — C6 : messagerie conseiller (état vide).
 * Oracle §14 : /conseiller/messagerie → « Messagerie » + « Aucune conversation. » (aucune seedée).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'
import { E2E_UIDS } from './_fixtures/seed-e2e'

test.use({ storageState: storageStatePath('conseiller') })

test.beforeAll(async () => {
  // État vide garanti : le conseiller « contacte » via recruteurUid (cf. C1) → purge.
  await getPrisma().conversation.deleteMany({ where: { recruteurUid: E2E_UIDS.conseiller } }).catch(() => {})
})

test.afterAll(async () => { await disconnectPrisma() })

test.describe('C6 — messagerie conseiller @secondaire', () => {
  test('état vide : aucune conversation', async ({ page }) => {
    await page.goto('/conseiller/messagerie')

    await expect(page.getByRole('heading', { name: /^messagerie$/i }).first()).toBeVisible()
    await expect(page.getByText(/aucune conversation/i).first()).toBeVisible()
  })
})
