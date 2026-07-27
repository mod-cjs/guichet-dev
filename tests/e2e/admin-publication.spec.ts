/**
 * GUIC-153 — @smoke Ad1 : admin publie une opportunité (file de modération).
 * Oracle §13 : /admin/opportunites → « Approuver » (confirm) → statut publiee.
 */

import { test, expect } from '@playwright/test'
import { seedOpportunite } from './_fixtures/seed-e2e'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('admin') })

let cleanup: (() => Promise<void>) | undefined
const SLUG = 'e2e-ad1-a-publier'
const TITRE = 'Opportunité E2E Ad1 à publier'

test.beforeAll(async () => {
  const o = await seedOpportunite({ slug: SLUG, titre: TITRE, statut: 'brouillon' })
  cleanup = o.cleanup
})

test.afterAll(async () => {
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('Ad1 — admin publie une opportunité @smoke', () => {
  test('approuver un brouillon → publiée', async ({ page }) => {
    // Accepte la confirmation window.confirm.
    page.on('dialog', (d) => d.accept())

    await page.goto('/admin/opportunites')

    // Cible la CARTE du brouillon : le div le plus profond contenant le titre ET un bouton
    // Approuver (les ancêtres matchent aussi hasText+has → `.last()` = la carte elle-même).
    const carte = page
      .locator('div')
      .filter({ hasText: TITRE })
      .filter({ has: page.getByRole('button', { name: /^approuver$/i }) })
      .last()
    await expect(carte).toBeVisible()
    await carte.getByRole('button', { name: /^approuver$/i }).click()

    // Vérification déterministe : statut publiee + traçabilité de modération.
    await expect
      .poll(async () => {
        const o = await getPrisma().opportunite.findUnique({ where: { slug: SLUG }, select: { statut: true } })
        return o?.statut
      }, { timeout: 8000 })
      .toBe('publiee')
  })
})
