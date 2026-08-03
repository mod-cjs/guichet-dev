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
let slug = ''
const TITRE = 'OppFavE2EJ4 Développeur'

test.beforeAll(async () => {
  const o = await seedOpportunite({ slug: 'e2e-j4-favori', titre: TITRE, statut: 'publiee' })
  oppId = o.id; slug = o.slug; cleanup = o.cleanup
  await getPrisma().opportuniteFavorite.deleteMany({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }).catch(() => {})
})

test.afterAll(async () => {
  await getPrisma().opportuniteFavorite.deleteMany({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }).catch(() => {})
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('J4 — favoris @secondaire', () => {
  test('ajouter aux favoris depuis une carte → persisté', async ({ page }) => {
    // Nav directe au détail (par slug) — indépendante du full-text (une opp fraîche n'est pas
    // immédiatement indexée). Le bouton favori du détail est labellisé « Sauvegarder ».
    await page.goto(`/opportunites/${slug}`)
    await page.getByRole('button', { name: /^sauvegarder$/i }).first().click()

    await expect
      .poll(async () => getPrisma().opportuniteFavorite.count({ where: { cjsUid: E2E_UIDS.jeune, opportuniteId: oppId } }), { timeout: 8000 })
      .toBe(1)
  })
})
