/**
 * GUIC-153 — Ad7 : l'admin crée un type d'opportunité (CRUD).
 * Oracle §14 : /admin/types-opportunite → « Nouveau type » → modal → « Créer le type » → OpportuniteType (DB).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('admin') })

const LIBELLE = 'Type E2E Ad7'
const SLUG = 'type_e2e_ad7'

async function purge() {
  await getPrisma().opportuniteType.deleteMany({ where: { OR: [{ libelle: LIBELLE }, { slug: SLUG }] } }).catch(() => {})
}

test.afterAll(async () => { await purge(); await disconnectPrisma() })

test.describe('Ad7 — types d’opportunité (admin) @secondaire', () => {
  test('créer un type via le formulaire → en base', async ({ page }) => {
    await purge()
    await page.goto('/admin/types-opportunite')
    await page.getByRole('button', { name: /nouveau type/i }).click()

    await page.locator('#type-libelle').fill(LIBELLE)
    await page.locator('#type-slug').fill(SLUG)
    await page.locator('#type-action').fill('Postuler')
    await page.locator('#type-ordre').fill('99')
    await page.getByRole('button', { name: /créer le type/i }).click()

    await expect
      .poll(async () => getPrisma().opportuniteType.count({ where: { slug: SLUG } }), { timeout: 8000 })
      .toBe(1)
  })
})
