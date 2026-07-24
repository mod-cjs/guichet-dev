/**
 * GUIC-153 — J4 : ajouter une opportunité aux favoris (jeune).
 * Oracle §14 : carte opportunité → bouton favori → OpportuniteFavorite persistée (DB).
 */

import { test, expect } from '@playwright/test'
import { seedOpportunite, E2E_UIDS } from './_fixtures/seed-e2e'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('jeune') })

let cleanup: (() => Promise<void>) | undefined
let oppId = ''
const TITRE = 'OppFavE2EJ4 Développeur'

test.beforeAll(async () => {
  const o = await seedOpportunite({ slug: 'e2e-j4-favori', titre: TITRE, statut: 'publiee' })
  oppId = o.id; cleanup = o.cleanup
  await getPrisma().opportuniteFavorite.deleteMany({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }).catch(() => {})
})

test.afterAll(async () => {
  await getPrisma().opportuniteFavorite.deleteMany({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }).catch(() => {})
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('J4 — favoris @secondaire', () => {
  test('ajouter aux favoris depuis une carte → persisté', async ({ page }) => {
    await page.goto('/opportunites')
    // Restreint la liste à notre opportunité (terme unique) pour cibler sa carte.
    await page.getByRole('searchbox', { name: /rechercher une opportunit/i }).fill('OppFavE2EJ4')
    await page.waitForResponse((r) => r.url().includes('/api/opportunites') && r.ok())

    const carte = page.locator('[data-testid="opp-card"]').filter({ hasText: TITRE }).first()
    await carte.getByRole('button', { name: /ajouter aux favoris/i }).click()

    await expect
      .poll(async () => getPrisma().opportuniteFavorite.count({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }), { timeout: 8000 })
      .toBe(1)
  })
})
