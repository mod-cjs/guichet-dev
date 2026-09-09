/**
 * GUIC-153 — @smoke R1 : recruteur publie une offre (→ statut brouillon, l'admin publiera).
 * Oracle §13 : /recruteur/mes-offres/nouvelle → « Soumettre à validation » → ?creee=1, statut brouillon.
 */

import { test, expect } from '@playwright/test'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('recruteur') })

const TITRE = 'Offre E2E R1 dev junior'

test.afterAll(async () => {
  const prisma = getPrisma()
  await prisma.opportunite.deleteMany({ where: { titre: TITRE } }).catch(() => {})
  await disconnectPrisma()
})

test.describe('R1 — recruteur publie une offre @smoke', () => {
  test('créer une offre → brouillon (jamais publiée directement)', async ({ page }) => {
    await page.goto('/recruteur/mes-offres/nouvelle')

    // Form recruteur : pas d'id → cibler par name/placeholder (cf. oracle).
    await page.locator('input[name="titre"]').fill(TITRE)
    const editor = page.locator('[contenteditable="true"]').first()
    await editor.click()
    await editor.pressSequentially('Missions E2E : développement web. Profil junior motivé. Conditions : présentiel Dakar.')

    // GUIC-684 — rattachement à au moins un programme OBLIGATOIRE.
    await page
      .getByRole('group', { name: 'Programmes de rattachement' })
      .getByRole('button', { name: 'YEAH' })
      .click()

    await page.getByRole('button', { name: /soumettre à validation/i }).click()

    // Redirection avec ?creee=1 + offre visible.
    await page.waitForURL(/\/recruteur\/mes-offres\?creee=1/)
    await expect(page.getByText(TITRE).first()).toBeVisible()

    // Invariant clé : le recruteur ne publie JAMAIS → statut brouillon en base.
    const opp = await getPrisma().opportunite.findFirst({ where: { titre: TITRE }, select: { statut: true } })
    expect(opp?.statut).toBe('brouillon')
  })
})
