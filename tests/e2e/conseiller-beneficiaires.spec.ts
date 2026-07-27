/**
 * GUIC-153 — C1 : annuaire des bénéficiaires + fiche (conseiller).
 * Oracle §14 : /conseiller/beneficiaires (jeunes rattachés au centre) → fiche bénéficiaire.
 * Un check-in sur le centre rattache le jeune à l'annuaire.
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath, E2E_CENTRE_SLUG } from './_fixtures/roles'
import { E2E_UIDS } from './_fixtures/seed-e2e'

test.use({ storageState: storageStatePath('conseiller') })

let checkInId = ''

test.beforeAll(async () => {
  const prisma = getPrisma()
  const centre = await prisma.centre.findFirstOrThrow({ where: { slug: E2E_CENTRE_SLUG }, select: { id: true } })
  const ci = await prisma.checkIn.create({
    data: { cjsUid: E2E_UIDS.jeune, centreId: centre.id, via: 'QrCard' },
  })
  checkInId = ci.id
})

test.afterAll(async () => {
  await getPrisma().checkIn.deleteMany({ where: { id: checkInId } }).catch(() => {})
  await disconnectPrisma()
})

test.describe('C1 — bénéficiaires conseiller @secondaire', () => {
  test('liste → fiche d’un bénéficiaire', async ({ page }) => {
    await page.goto('/conseiller/beneficiaires')
    await expect(page.getByRole('heading', { name: /^bénéficiaires$/i }).first()).toBeVisible()

    // Le jeune ayant un check-in apparaît → ouvrir sa fiche (exclure le lien « Exporter »).
    const ligne = page.locator('a[href*="/conseiller/beneficiaires/"]:not([href*="export"])').first()
    await expect(ligne).toBeVisible()
    await ligne.click()
    await page.waitForURL(/\/conseiller\/beneficiaires\/[^/]+$/)

    // Fiche : section « Informations ».
    await expect(page.getByRole('heading', { name: /^informations$/i }).first()).toBeVisible()
  })
})
