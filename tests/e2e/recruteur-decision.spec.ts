/**
 * GUIC-153 — @smoke R2 : recruteur décide sur un candidat (Retenir).
 * Oracle §13 : /recruteur/candidatures/[id] → « Retenir » → statut Retenue + pipeline Decision.
 */

import { test, expect } from '@playwright/test'
import { seedOpportunite, seedCandidature, combineCleanups, E2E_UIDS } from './_fixtures/seed-e2e'
import { getPrisma, disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('recruteur') })

let cleanup: (() => Promise<void>) | undefined
let candidatureId = ''

test.beforeAll(async () => {
  // Offre appartenant au recruteur + candidature En_attente d'un candidat.
  const opp = await seedOpportunite({
    slug: 'e2e-r2-offre',
    titre: 'Offre E2E R2 décision',
    statut: 'publiee',
    recruteurUid: E2E_UIDS.recruteur,
  })
  const cand = await seedCandidature({
    cjsUid: E2E_UIDS.candidat,
    opportuniteId: opp.id,
    statut: 'En_attente',
  })
  candidatureId = cand.id
  cleanup = combineCleanups(opp.cleanup, cand.cleanup)
})

test.afterAll(async () => {
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('R2 — recruteur décide @smoke', () => {
  test('retenir un candidat → Retenue', async ({ page }) => {
    await page.goto(`/recruteur/candidatures/${candidatureId}`)

    await page.getByRole('button', { name: /^retenir$/i }).click()

    // Le bouton bascule en « Retenu » (désactivé) + statut Retenue en base.
    await expect(page.getByRole('button', { name: /^retenu$/i })).toBeVisible()
    await expect
      .poll(async () => {
        const c = await getPrisma().candidature.findUnique({
          where: { id: candidatureId },
          select: { statut: true, pipelineStage: true },
        })
        return `${c?.statut}:${c?.pipelineStage}`
      }, { timeout: 8000 })
      .toBe('Retenue:Decision')
  })
})
