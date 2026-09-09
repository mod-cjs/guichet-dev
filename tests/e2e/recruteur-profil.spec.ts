/**
 * GUIC-153 — R4 : le recruteur édite son profil entreprise.
 * Oracle §14 : /recruteur/profil-entreprise → « Enregistrer » → Organisation mise à jour (DB).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'
import { E2E_UIDS } from './_fixtures/seed-e2e'

test.use({ storageState: storageStatePath('recruteur') })

const ADRESSE = 'Immeuble E2E, Plateau, Dakar'

test.afterAll(async () => {
  await getPrisma().organisation.updateMany({ where: { cjsUid: E2E_UIDS.recruteur }, data: { adresse: null } }).catch(() => {})
  await disconnectPrisma()
})

test.describe('R4 — profil entreprise recruteur @secondaire', () => {
  test('éditer l’adresse → persistée en base', async ({ page }) => {
    await page.goto('/recruteur/profil-entreprise')
    await page.locator('input[name="adresse"]').fill(ADRESSE)
    await page.getByRole('button', { name: /^enregistrer$/i }).click()

    await expect
      .poll(async () => (await getPrisma().organisation.findFirst({
        where: { cjsUid: E2E_UIDS.recruteur }, select: { adresse: true },
      }))?.adresse, { timeout: 8000 })
      .toBe(ADRESSE)
  })
})
