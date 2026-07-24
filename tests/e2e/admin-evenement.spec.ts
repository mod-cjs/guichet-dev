/**
 * GUIC-153 — Ad5 : l'admin crée un événement.
 * Oracle §14 : /admin/evenements → « Ajouter un événement » → modal → « Créer » → Evenement (DB).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('admin') })

const TITRE = 'Événement E2E Ad5 admin'

test.afterAll(async () => {
  await getPrisma().evenement.deleteMany({ where: { titre: TITRE } }).catch(() => {})
  await disconnectPrisma()
})

test.describe('Ad5 — admin crée un événement @secondaire', () => {
  test('créer via le formulaire → en base', async ({ page }) => {
    await getPrisma().evenement.deleteMany({ where: { titre: TITRE } }).catch(() => {})

    await page.goto('/admin/evenements')
    await page.getByRole('button', { name: /ajouter un événement/i }).click()

    await page.locator('#ev-titre').fill(TITRE)
    // Description obligatoire (RichTextEditor Tiptap = contenteditable dans la modal).
    const editeur = page.getByRole('dialog').locator('[contenteditable="true"]').first()
    await editeur.click()
    await editeur.pressSequentially('Description E2E de l’événement admin, suffisamment longue.')
    await page.locator('#ev-date').fill('2026-12-05T09:00')
    await page.locator('#ev-lieu').fill('Grand Théâtre, Dakar')
    await page.getByRole('button', { name: /^créer$/i }).click()

    await expect
      .poll(async () => getPrisma().evenement.count({ where: { titre: TITRE } }), { timeout: 8000 })
      .toBe(1)
  })
})
