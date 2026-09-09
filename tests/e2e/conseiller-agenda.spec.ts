/**
 * GUIC-153 — C5 : agenda du conseiller (lecture).
 * Oracle §14 : /conseiller/agenda → « Agenda & RDV » + sélecteur de vue Jour/Semaine/Mois.
 */

import { test, expect } from '@playwright/test'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('conseiller') })

test.afterAll(async () => { await disconnectPrisma() })

test.describe('C5 — agenda conseiller @secondaire', () => {
  test('affiche l’agenda et le sélecteur de vue', async ({ page }) => {
    await page.goto('/conseiller/agenda')

    await expect(page.getByRole('heading', { name: /agenda.*rdv/i }).first()).toBeVisible()
    // Sélecteur de vue (tablist Jour/Semaine/Mois).
    await expect(page.getByRole('tab', { name: /^jour$/i }).first()).toBeVisible()
    await expect(page.getByRole('tab', { name: /^mois$/i }).first()).toBeVisible()
  })
})
