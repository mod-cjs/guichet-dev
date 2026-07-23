/**
 * GUIC-153 — @smoke J6 : inscription à un événement (jeune).
 * Oracle §13 : /agenda/[id] → « S'inscrire — c'est gratuit » → pill « Tu es inscrit·e ».
 */

import { test, expect } from '@playwright/test'
import { seedEvenement } from './_fixtures/seed-e2e'
import { disconnectPrisma } from './_fixtures/prisma'
import { storageStatePath } from './_fixtures/roles'

test.use({ storageState: storageStatePath('jeune') })

let cleanup: (() => Promise<void>) | undefined
let eventId = ''

test.beforeAll(async () => {
  const ev = await seedEvenement({ titre: 'Atelier E2E inscription J6', dansJours: 14, capaciteMax: 50 })
  eventId = ev.id
  cleanup = ev.cleanup
})

test.afterAll(async () => {
  await cleanup?.()
  await disconnectPrisma()
})

test.describe('J6 — inscription événement @smoke', () => {
  test("s'inscrire à un événement → confirmé", async ({ page }) => {
    await page.goto(`/agenda/${eventId}`)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Atelier E2E inscription J6')

    // ∅ « Complet » / « Inscriptions fermées » — l'inscription est ouverte.
    await expect(page.getByRole('button', { name: /s'inscrire — c'est gratuit/i })).toBeVisible()

    await page.getByRole('button', { name: /s'inscrire — c'est gratuit/i }).click()

    // État inscrit (optimiste) : pill de confirmation + bouton de désinscription.
    await expect(page.getByText(/tu es inscrit/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /se désinscrire/i })).toBeVisible()
  })
})
