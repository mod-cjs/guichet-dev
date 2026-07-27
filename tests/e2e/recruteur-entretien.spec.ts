/**
 * GUIC-153 — R3 : le recruteur planifie un entretien.
 * Oracle §14 : /recruteur/entretiens → « Planifier un entretien » → form → « Planifier » → Entretien (DB).
 */

import { test, expect } from '@playwright/test'
import { seedOpportunite, seedCandidature, combineCleanups, E2E_UIDS } from './_fixtures/seed-e2e'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('recruteur') })

let cleanup: (() => Promise<void>) | undefined
let candidatureId = ''

test.beforeAll(async () => {
  const opp = await seedOpportunite({ slug: 'e2e-r3-entretien', titre: 'Offre E2E R3 entretien', statut: 'publiee', recruteurUid: E2E_UIDS.recruteur })
  const cand = await seedCandidature({ cjsUid: E2E_UIDS.candidat, opportuniteId: opp.id, statut: 'Vue' })
  candidatureId = cand.id
  cleanup = combineCleanups(opp.cleanup, cand.cleanup)
  await getPrisma().entretien.deleteMany({ where: { candidatureId } }).catch(() => {})
})

test.afterAll(async () => {
  await getPrisma().entretien.deleteMany({ where: { candidatureId } }).catch(() => {})
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('R3 — planifier un entretien @secondaire', () => {
  test('planifier → Entretien en base', async ({ page }) => {
    await page.goto('/recruteur/entretiens')
    await page.getByRole('button', { name: /planifier un entretien/i }).click()

    await page.locator('select[name="candidatureId"]').selectOption({ index: 1 })
    await page.locator('input[name="dateHeure"]').fill('2026-12-10T10:00')
    await page.getByRole('button', { name: /^planifier$/i }).click()

    await expect
      .poll(async () => getPrisma().entretien.count({ where: { candidatureId } }), { timeout: 8000 })
      .toBe(1)
  })
})
