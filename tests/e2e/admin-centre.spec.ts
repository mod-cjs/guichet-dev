/**
 * GUIC-153 — Ad4 : l'admin crée un centre.
 * Oracle §14 : /admin/centres → « Ajouter un centre » → modal → « Créer » → Centre (DB).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('admin') })

const NOM = 'Centre E2E Ad4 création'

async function purge() {
  const prisma = getPrisma()
  const c = await prisma.centre.findFirst({ where: { nom: NOM }, select: { id: true } })
  if (c) {
    await prisma.centreHoraire.deleteMany({ where: { centreId: c.id } }).catch(() => {})
    await prisma.centre.delete({ where: { id: c.id } }).catch(() => {})
  }
}

test.afterAll(async () => { await purge(); await disconnectPrisma() })

test.describe('Ad4 — admin crée un centre @secondaire', () => {
  test('créer via le formulaire → en base', async ({ page }) => {
    await purge()
    await page.goto('/admin/centres')
    await page.getByRole('button', { name: /ajouter un centre/i }).click()

    await page.locator('#centre-nom').fill(NOM)
    await page.locator('#centre-region').selectOption('Dakar')
    await page.locator('#centre-adresse').fill('1 rue E2E, Dakar')
    await page.locator('#centre-latitude').fill('14.7')
    await page.locator('#centre-longitude').fill('-17.4')
    await page.locator('#centre-telephone').fill('+221770000099')
    await page.locator('#centre-responsable').fill('Responsable E2E')
    await page.getByRole('button', { name: /^créer$/i }).click()

    await expect
      .poll(async () => getPrisma().centre.count({ where: { nom: NOM } }), { timeout: 8000 })
      .toBe(1)
  })
})
