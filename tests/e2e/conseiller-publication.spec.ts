/**
 * GUIC-153 — C2 : le conseiller crée une publication (chemin de validation).
 * Oracle §14 : /conseiller/publications/nouvelle → « Soumettre pour validation »
 * → Evenement statut `en_relecture`, scopé au centre du conseiller (invisible public).
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath, E2E_CENTRE_SLUG } from './_fixtures/roles'

test.use({ storageState: storageStatePath('conseiller') })

const TITRE = 'Publication E2E C2 conseiller'

test.afterAll(async () => {
  await getPrisma().evenement.deleteMany({ where: { titre: TITRE } }).catch(() => {})
  await disconnectPrisma()
})

test.describe('C2 — publication conseiller @secondaire', () => {
  test('créer une publication → soumise à validation (en_relecture)', async ({ page }) => {
    const prisma = getPrisma()
    await prisma.evenement.deleteMany({ where: { titre: TITRE } }).catch(() => {})

    await page.goto('/conseiller/publications/nouvelle')
    await expect(page.getByRole('heading', { name: /nouvelle publication/i })).toBeVisible()

    await page.locator('#pub-titre').fill(TITRE)
    await page.locator('[contenteditable="true"]').first().click()
    await page.locator('[contenteditable="true"]').first().pressSequentially('Atelier E2E — contenu de description suffisant.')
    await page.locator('#pub-date').fill('2026-12-01T10:00')
    await page.locator('#pub-lieu').fill('Salle A — Centre E2E')
    await page.getByRole('button', { name: /soumettre pour validation/i }).click()

    // Retour à la liste + preuve DB : Evenement en_relecture rattaché au centre du conseiller.
    await page.waitForURL(/\/conseiller\/publications/)
    const centre = await prisma.centre.findFirstOrThrow({ where: { slug: E2E_CENTRE_SLUG }, select: { id: true } })
    await expect
      .poll(async () => {
        const ev = await prisma.evenement.findFirst({ where: { titre: TITRE }, select: { statut: true, centreId: true } })
        return ev ? `${ev.statut}:${ev.centreId === centre.id}` : 'absent'
      }, { timeout: 8000 })
      .toBe('en_relecture:true')
  })
})
